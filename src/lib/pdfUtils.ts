import * as pdfjsLib from 'pdfjs-dist';

// Set GlobalWorkerOptions for pdfjs-dist
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version || '4.10.38'}/build/pdf.worker.min.mjs`;

export const convertPdfToJpeg = async (input: File | string): Promise<string> => {
  try {
    let data: Uint8Array | ArrayBuffer;

    if (input instanceof File) {
      data = await input.arrayBuffer();
    } else if (typeof input === 'string' && input.startsWith('data:application/pdf')) {
      const base64Str = input.split(',')[1];
      const binaryStr = atob(base64Str);
      const len = binaryStr.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }
      data = bytes.buffer;
    } else {
      throw new Error('Invalid PDF input');
    }

    const loadingTask = pdfjsLib.getDocument({ data });
    const pdf = await loadingTask.promise;
    if (pdf.numPages === 0) {
      throw new Error('PDF has no pages');
    }

    const page = await pdf.getPage(1);
    const unscaledViewport = page.getViewport({ scale: 1.0 });

    // Target width max 1000px for high quality & small data URL size
    const targetWidth = 1000;
    const scale = targetWidth / unscaledViewport.width;
    const viewport = page.getViewport({ scale: Math.min(scale, 2.0) });

    const canvas = document.createElement('canvas');
    canvas.width = Math.round(viewport.width);
    canvas.height = Math.round(viewport.height);

    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Failed to create canvas context');
    }

    // Fill white background for PDF rendering
    context.fillStyle = '#FFFFFF';
    context.fillRect(0, 0, canvas.width, canvas.height);

    const renderContext = {
      canvasContext: context,
      viewport: viewport,
      canvas: canvas
    };

    await (page.render(renderContext as any).promise);

    // Convert canvas to compressed JPEG
    return canvas.toDataURL('image/jpeg', 0.8);
  } catch (err) {
    console.error('PDF to JPEG conversion error:', err);
    throw err;
  }
};
