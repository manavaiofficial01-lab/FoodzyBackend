const db = require("./config/db");

const data = [
  {"id":111,"name":"Bday Cake","image":"https://firebasestorage.googleapis.com/v0/b/manavai-2adb5.firebasestorage.app/o/Project%20Assets%2FCategories%2Fbdaycake.png?alt=media","created_at":"2025-12-23T19:11:21.000Z","updated_at":"2026-03-30T18:54:58.000Z","group_id":null},
  {"id":103,"name":"Noodles","image":"https://firebasestorage.googleapis.com/v0/b/manavai-2adb5.firebasestorage.app/o/Project%20Assets%2FCategories%2Fnoodles.png?alt=media","created_at":"2025-12-23T19:11:21.000Z","updated_at":"2026-03-30T18:54:58.000Z","group_id":null},
  {"id":104,"name":"Rolls","image":"https://firebasestorage.googleapis.com/v0/b/manavai-2adb5.firebasestorage.app/o/Project%20Assets%2FCategories%2Frolls.png?alt=media","created_at":"2025-12-23T19:11:21.000Z","updated_at":"2026-03-30T18:54:58.000Z","group_id":null},
  {"id":105,"name":"Momos","image":"https://firebasestorage.googleapis.com/v0/b/manavai-2adb5.firebasestorage.app/o/Project%20Assets%2FCategories%2Fmomos.png?alt=media","created_at":"2025-12-23T19:11:21.000Z","updated_at":"2026-03-30T18:54:58.000Z","group_id":null},
  {"id":106,"name":"Sandwich","image":"https://firebasestorage.googleapis.com/v0/b/manavai-2adb5.firebasestorage.app/o/Project%20Assets%2FCategories%2Fsandwich.jpg?alt=media","created_at":"2025-12-23T19:11:21.000Z","updated_at":"2026-03-30T18:54:58.000Z","group_id":null},
  {"id":107,"name":"Soup","image":"https://firebasestorage.googleapis.com/v0/b/manavai-2adb5.firebasestorage.app/o/Project%20Assets%2FCategories%2Fsoup.png?alt=media","created_at":"2025-12-23T19:11:21.000Z","updated_at":"2026-03-30T18:54:58.000Z","group_id":null},
  {"id":108,"name":"Veg","image":"https://firebasestorage.googleapis.com/v0/b/manavai-2adb5.firebasestorage.app/o/Project%20Assets%2FCategories%2Fveg.png?alt=media","created_at":"2025-12-23T19:11:21.000Z","updated_at":"2026-03-30T18:54:58.000Z","group_id":null},
  {"id":109,"name":"Sweets","image":"https://firebasestorage.googleapis.com/v0/b/manavai-2adb5.firebasestorage.app/o/Project%20Assets%2FCategories%2Fswwts.png?alt=media","created_at":"2025-12-23T19:11:21.000Z","updated_at":"2026-03-30T18:54:58.000Z","group_id":null},
  {"id":110,"name":"Cake's","image":"https://firebasestorage.googleapis.com/v0/b/manavai-2adb5.firebasestorage.app/o/Project%20Assets%2FCategories%2Fcakes.png?alt=media","created_at":"2025-12-23T19:11:21.000Z","updated_at":"2026-03-30T18:54:58.000Z","group_id":null},
  {"id":102,"name":"Naan & Gravy","image":"https://firebasestorage.googleapis.com/v0/b/manavai-2adb5.firebasestorage.app/o/Project%20Assets%2FCategories%2Fnorthindian.png?alt=media","created_at":"2025-12-23T19:11:21.000Z","updated_at":"2026-03-30T18:54:58.000Z","group_id":null},
  {"id":112,"name":"Ice Cream","image":"https://firebasestorage.googleapis.com/v0/b/manavai-2adb5.firebasestorage.app/o/Project%20Assets%2FCategories%2Ficecream.png?alt=media","created_at":"2025-12-23T19:11:21.000Z","updated_at":"2026-03-30T18:54:58.000Z","group_id":null},
  {"id":113,"name":"Coffee","image":"https://firebasestorage.googleapis.com/v0/b/manavai-2adb5.firebasestorage.app/o/Project%20Assets%2FCategories%2Fcoffee.png?alt=media","created_at":"2025-12-23T19:11:21.000Z","updated_at":"2026-03-30T18:54:58.000Z","group_id":null},
  {"id":114,"name":"Tea","image":"https://firebasestorage.googleapis.com/v0/b/manavai-2adb5.firebasestorage.app/o/Project%20Assets%2FCategories%2Ftea.png?alt=media","created_at":"2025-12-23T19:11:21.000Z","updated_at":"2026-03-30T18:54:58.000Z","group_id":null},
  {"id":115,"name":"Fresh Juice","image":"https://firebasestorage.googleapis.com/v0/b/manavai-2adb5.firebasestorage.app/o/Project%20Assets%2FCategories%2Ffreshjuice.png?alt=media","created_at":"2025-12-23T19:11:21.000Z","updated_at":"2026-03-30T18:54:58.000Z","group_id":null},
  {"id":116,"name":"Shakes","image":"https://firebasestorage.googleapis.com/v0/b/manavai-2adb5.firebasestorage.app/o/Project%20Assets%2FCategories%2Fshakes.png?alt=media","created_at":"2025-12-23T19:11:21.000Z","updated_at":"2026-03-30T18:54:58.000Z","group_id":null},
  {"id":117,"name":"Mocktail","image":"https://firebasestorage.googleapis.com/v0/b/manavai-2adb5.firebasestorage.app/o/Project%20Assets%2FCategories%2Fmocktail.png?alt=media","created_at":"2025-12-23T19:11:21.000Z","updated_at":"2026-03-30T18:54:58.000Z","group_id":null},
  {"id":118,"name":"Mojito","image":"https://firebasestorage.googleapis.com/v0/b/manavai-2adb5.firebasestorage.app/o/Project%20Assets%2FCategories%2Fmojito.png?alt=media","created_at":"2025-12-23T19:11:21.000Z","updated_at":"2026-03-30T18:54:58.000Z","group_id":null},
  {"id":94,"name":"Maggi","image":"https://firebasestorage.googleapis.com/v0/b/manavai-2adb5.firebasestorage.app/o/Project%20Assets%2FCategories%2Fmaggi.png?alt=media","created_at":"2025-12-23T19:11:21.000Z","updated_at":"2026-03-30T18:54:58.000Z","group_id":null},
  {"id":86,"name":"Biryani","image":"https://firebasestorage.googleapis.com/v0/b/manavai-2adb5.firebasestorage.app/o/Project%20Assets%2FCategories%2Fbiryani.png?alt=media","created_at":"2025-12-23T19:11:21.000Z","updated_at":"2026-03-30T18:54:58.000Z","group_id":null},
  {"id":87,"name":"Pizza","image":"https://firebasestorage.googleapis.com/v0/b/manavai-2adb5.firebasestorage.app/o/Project%20Assets%2FCategories%2Fpizza.png?alt=media","created_at":"2025-12-23T19:11:21.000Z","updated_at":"2026-03-30T18:54:58.000Z","group_id":null},
  {"id":88,"name":"Burger","image":"https://firebasestorage.googleapis.com/v0/b/manavai-2adb5.firebasestorage.app/o/Project%20Assets%2FCategories%2Fburger.png?alt=media","created_at":"2025-12-23T19:11:21.000Z","updated_at":"2026-03-30T18:54:58.000Z","group_id":null},
  {"id":89,"name":"Fried Chicken","image":"https://firebasestorage.googleapis.com/v0/b/manavai-2adb5.firebasestorage.app/o/Project%20Assets%2FCategories%2Ffriedchicken.png?alt=media","created_at":"2025-12-23T19:11:21.000Z","updated_at":"2026-03-30T18:54:58.000Z","group_id":null},
  {"id":90,"name":"Crispy","image":"https://firebasestorage.googleapis.com/v0/b/manavai-2adb5.firebasestorage.app/o/Project%20Assets%2FCategories%2Fcrispy.png?alt=media","created_at":"2025-12-23T19:11:21.000Z","updated_at":"2026-03-30T18:54:58.000Z","group_id":null},
  {"id":91,"name":"Snacks","image":"https://firebasestorage.googleapis.com/v0/b/manavai-2adb5.firebasestorage.app/o/Project%20Assets%2FCategories%2Fsnacks.png?alt=media","created_at":"2025-12-23T19:11:21.000Z","updated_at":"2026-03-30T18:54:58.000Z","group_id":null},
  {"id":92,"name":"Chicken","image":"https://firebasestorage.googleapis.com/v0/b/manavai-2adb5.firebasestorage.app/o/Project%20Assets%2FCategories%2Fchicken.png?alt=media","created_at":"2025-12-23T19:11:21.000Z","updated_at":"2026-03-30T18:54:58.000Z","group_id":null},
  {"id":93,"name":"Pasta","image":"https://firebasestorage.googleapis.com/v0/b/manavai-2adb5.firebasestorage.app/o/Project%20Assets%2FCategories%2Fpasta.png?alt=media","created_at":"2025-12-23T19:11:21.000Z","updated_at":"2026-03-30T18:54:58.000Z","group_id":null},
  {"id":85,"name":"Offers","image":"https://firebasestorage.googleapis.com/v0/b/manavai-2adb5.firebasestorage.app/o/Project%20Assets%2FCategories%2Foffers.png?alt=media","created_at":"2025-12-23T19:11:21.000Z","updated_at":"2026-03-30T18:54:58.000Z","group_id":null},
  {"id":95,"name":"Chilli Chicken","image":"https://firebasestorage.googleapis.com/v0/b/manavai-2adb5.firebasestorage.app/o/Project%20Assets%2FCategories%2Fchilli%20chicken.png?alt=media","created_at":"2025-12-23T19:11:21.000Z","updated_at":"2026-03-30T18:54:58.000Z","group_id":null},
  {"id":96,"name":"Mutton","image":"https://firebasestorage.googleapis.com/v0/b/manavai-2adb5.firebasestorage.app/o/Project%20Assets%2FCategories%2Fmutton.png?alt=media","created_at":"2025-12-23T19:11:21.000Z","updated_at":"2026-03-30T18:54:58.000Z","group_id":null},
  {"id":97,"name":"Sea Foods","image":"https://firebasestorage.googleapis.com/v0/b/manavai-2adb5.firebasestorage.app/o/Project%20Assets%2FCategories%2Ffish.png?alt=media","created_at":"2025-12-23T19:11:21.000Z","updated_at":"2026-03-30T18:54:58.000Z","group_id":null},
  {"id":98,"name":"South Indian","image":"https://firebasestorage.googleapis.com/v0/b/manavai-2adb5.firebasestorage.app/o/Project%20Assets%2FCategories%2Fidli.png?alt=media","created_at":"2025-12-23T19:11:21.000Z","updated_at":"2026-03-30T18:54:58.000Z","group_id":null},
  {"id":99,"name":"Dosa","image":"https://firebasestorage.googleapis.com/v0/b/manavai-2adb5.firebasestorage.app/o/Project%20Assets%2FCategories%2Fdosa.png?alt=media","created_at":"2025-12-23T19:11:21.000Z","updated_at":"2026-03-30T18:54:58.000Z","group_id":null},
  {"id":100,"name":"Parotta","image":"https://firebasestorage.googleapis.com/v0/b/manavai-2adb5.firebasestorage.app/o/Project%20Assets%2FCategories%2Fparotta.png?alt=media","created_at":"2025-12-23T19:11:21.000Z","updated_at":"2026-03-30T18:54:58.000Z","group_id":null},
  {"id":101,"name":"Fried Rice","image":"https://firebasestorage.googleapis.com/v0/b/manavai-2adb5.firebasestorage.app/o/Project%20Assets%2FCategories%2Ffriedrice.png?alt=media","created_at":"2025-12-23T19:11:21.000Z","updated_at":"2026-03-30T18:54:58.000Z","group_id":null}
];

async function updateData() {
  for (const item of data) {
    const { id, name, image, group_id } = item;
    
    // We use ON DUPLICATE KEY UPDATE so it updates if it exists or inserts if it doesn't
    const query = `
      INSERT INTO food_categories (id, name, image, group_id)
      VALUES (?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
      name = VALUES(name), image = VALUES(image), group_id = VALUES(group_id)
    `;
    
    await new Promise((resolve, reject) => {
      db.query(query, [id, name, image, group_id], (err) => {
        if (err) {
          console.error(`Error processing ID ${id}:`, err.message);
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }
  console.log("Categories fixed successfully.");
  process.exit(0);
}

updateData();
