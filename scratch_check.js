const mongoose = require('mongoose');
require('dotenv').config();

async function run() {
  const url = process.env.MONGODB_URL;
  console.log('Connecting to:', url);
  await mongoose.connect(url);
  console.log('Connected!');
  
  const db = mongoose.connection.client.db('test');
  
  // Fetch current settings
  const settings = await db.collection('settings').findOne({});
  if (!settings) {
    console.error('Settings not found!');
    await mongoose.disconnect();
    return;
  }
  
  console.log('Current Settings ID:', settings._id);

  // Define German Cards
  const deCards = [
    {
      name: 'Salmon Box',
      subtitle: 'Perfekt für 1 Personen',
      price: '21,90',
      oldPrice: '24,90',
      tag: '',
      items: '2x Lachs Nigiri\n6x Lachs Maki Roll\n8x Alaska I.O\n3x Lachs Sashimi'
    },
    {
      name: 'Sushi Couple',
      subtitle: 'Für 2 Personen',
      price: '39,90',
      oldPrice: '',
      tag: 'Bestseller',
      items: '4x Nigiri\n6x Maki Roll\n6x Sashimi\n8x In site out roll\n4x Dragon Roll Aburi\n4x Spicy Tuna Aburi'
    },
    {
      name: 'Vegetarisches Menü',
      subtitle: 'Für 2 Personen',
      price: '19,90',
      oldPrice: '',
      tag: 'Veggie',
      items: '6x Avocado Maki\n4x Kappa Maki\n2x Veggie Roll\n1x Edamame\n1x Miso Suppe'
    },
    {
      name: 'Omakase ',
      subtitle: 'Ab 2 Personen',
      price: '30,00€/1 Persone',
      oldPrice: '',
      tag: "Chef's Choice",
      items: '„Omakase“ jap. “Ich werde es Ihnen überlassen”.Lehnen Sie sich bequem zurück, denn die Auswahl trifft für Sie unser Sushi-Chef.Lassen Sie sich von einer exklusiven Auswahlaus unserer Karte, an Sushi-Kreationen überraschen.'
    },
    {
      name: 'Überraschung',
      subtitle: '3 Gänge Menü Ab 2 Personen',
      price: '39,90€/1 Persone',
      oldPrice: '',
      tag: "Chef's Choice",
      items: 'Vorspeise \n6 mix Sashimi , 5x nigiri , 16x Special Roll , 8 in side out roll , 12x maki , 12x Crunchy\nDessert'
    },
    {
      name: 'In Side Out Box',
      subtitle: 'Perfekt für 1 Personen',
      price: '19.90€',
      oldPrice: '27,90€',
      tag: '',
      items: '8x Spicy Tuna I.O\n8x Fresh Sommer\n8x Alaska I.O'
    }
  ];

  // Define English Cards
  const enCards = [
    {
      name: 'Salmon Box',
      subtitle: 'Perfect for 1 person',
      price: '21.90',
      oldPrice: '24.90',
      tag: '',
      items: '2x Salmon Nigiri\n6x Salmon Maki Roll\n8x Alaska I.O\n3x Salmon Sashimi'
    },
    {
      name: 'Sushi Couple',
      subtitle: 'For 2 persons',
      price: '39.90',
      oldPrice: '',
      tag: 'Bestseller',
      items: '4x Nigiri\n6x Maki Roll\n6x Sashimi\n8x Inside Out Roll\n4x Dragon Roll Aburi\n4x Spicy Tuna Aburi'
    },
    {
      name: 'Vegetarian Menu',
      subtitle: 'For 2 persons',
      price: '19.90',
      oldPrice: '',
      tag: 'Veggie',
      items: '6x Avocado Maki\n4x Kappa Maki\n2x Veggie Roll\n1x Edamame\n1x Miso Soup'
    },
    {
      name: 'Omakase',
      subtitle: 'From 2 persons',
      price: '30.00€/1 Person',
      oldPrice: '',
      tag: "Chef's Choice",
      items: '“Omakase” Japanese “I will leave it to you”. Sit back and relax, as the selection is made for you by our sushi chef. Let yourself be surprised by an exclusive selection of our sushi creations from our menu.'
    },
    {
      name: 'Surprise',
      subtitle: '3-Course Menu From 2 persons',
      price: '39.90€/1 Person',
      oldPrice: '',
      tag: "Chef's Choice",
      items: 'Appetizer\n6x Mixed Sashimi, 5x Nigiri, 16x Special Roll, 8x Inside Out Roll, 12x Maki, 12x Crunchy\nDessert'
    },
    {
      name: 'Inside Out Box',
      subtitle: 'Perfect for 1 person',
      price: '19.90€',
      oldPrice: '27.90€',
      tag: '',
      items: '8x Spicy Tuna I.O\n8x Fresh Summer\n8x Alaska I.O'
    }
  ];

  // Update in-memory settings
  const webContent = settings.webContent || {};
  if (!webContent.de) webContent.de = {};
  if (!webContent.en) webContent.en = {};
  
  if (!webContent.de.combosSection) webContent.de.combosSection = {};
  webContent.de.combosSection.cards = deCards;
  
  if (!webContent.en.combosSection) webContent.en.combosSection = {};
  webContent.en.combosSection.cards = enCards;

  // Save to DB
  await db.collection('settings').updateOne(
    { _id: settings._id },
    { $set: { webContent, updatedAt: new Date() } }
  );

  console.log('Successfully updated settings webContent in DB directly!');

  // Verify the updated document
  const updatedSettings = await db.collection('settings').findOne({ _id: settings._id });
  console.log('Verified DE cards count:', updatedSettings.webContent?.de?.combosSection?.cards?.length);
  console.log('Verified EN cards count:', updatedSettings.webContent?.en?.combosSection?.cards?.length);
  console.log('Verified EN cards sample:', JSON.stringify(updatedSettings.webContent?.en?.combosSection?.cards[0], null, 2));

  await mongoose.disconnect();
}
run().catch(console.error);
