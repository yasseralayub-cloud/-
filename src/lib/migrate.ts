import { db } from './firebase';
import { collection, setDoc, doc } from 'firebase/firestore';
import { categories, menuItems } from '../data/mockMenu';

export async function migrateData() {
  try {
    console.log('Starting migration...');
    
    // Migrate categories
    for (const category of categories) {
      await setDoc(doc(db, 'categories', category.id), category);
      console.log(`Migrated category: ${category.label}`);
    }

    // Migrate menu items
    for (const item of menuItems) {
      await setDoc(doc(db, 'menuItems', item.id), item);
      console.log(`Migrated menu item: ${item.name}`);
    }

    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
  }
}
