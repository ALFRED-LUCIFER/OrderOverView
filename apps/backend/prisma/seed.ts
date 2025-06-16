import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const customers = [
  { name: 'Acme Glass Co', email: 'orders@acmeglass.com', country: 'United States', city: 'New York', company: 'Acme Glass Co', phone: '+1-555-0101', address: '123 Glass Street, NY 10001' },
  { name: 'Glass Solutions Ltd', email: 'info@glasssolutions.com', country: 'United Kingdom', city: 'London', company: 'Glass Solutions Ltd', phone: '+44-20-7946-0958', address: '456 Glass Lane, London E1 6AN' },
  { name: 'Crystal Clear Inc', email: 'sales@crystalclear.com', country: 'Canada', city: 'Toronto', company: 'Crystal Clear Inc', phone: '+1-416-555-0123', address: '789 Crystal Ave, Toronto ON M5V 3A3' },
  { name: 'Premium Glass Works', email: 'orders@premiumglass.com', country: 'Australia', city: 'Sydney', company: 'Premium Glass Works', phone: '+61-2-9876-5432', address: '321 Premium St, Sydney NSW 2000' },
  { name: 'Euro Glass Manufacturing', email: 'contact@euroglass.de', country: 'Germany', city: 'Berlin', company: 'Euro Glass Manufacturing', phone: '+49-30-12345678', address: 'Glasstraße 45, 10115 Berlin' },
  { name: 'Tokyo Glass Industries', email: 'info@tokyoglass.jp', country: 'Japan', city: 'Tokyo', company: 'Tokyo Glass Industries', phone: '+81-3-1234-5678', address: '1-1-1 Glass Tower, Shibuya, Tokyo 150-0043' },
  { name: 'Shanghai Glazing Co', email: 'orders@shanghaiglazing.cn', country: 'China', city: 'Shanghai', company: 'Shanghai Glazing Co', phone: '+86-21-5555-0188', address: '888 Glass Road, Pudong, Shanghai 200000' },
  { name: 'Mumbai Glass Solutions', email: 'sales@mumbaiglass.in', country: 'India', city: 'Mumbai', company: 'Mumbai Glass Solutions', phone: '+91-22-2222-3333', address: 'Glass Complex, Andheri East, Mumbai 400069' },
  { name: 'São Paulo Vidros', email: 'contato@spvidros.br', country: 'Brazil', city: 'São Paulo', company: 'São Paulo Vidros', phone: '+55-11-9999-8888', address: 'Rua do Vidro, 123, São Paulo SP 01310-100' },
  { name: 'Nordic Glass AB', email: 'info@nordicglass.se', country: 'Sweden', city: 'Stockholm', company: 'Nordic Glass AB', phone: '+46-8-555-0199', address: 'Glasgatan 12, 111 52 Stockholm' },
  { name: 'French Glass Artisans', email: 'contact@frenchglass.fr', country: 'France', city: 'Paris', company: 'French Glass Artisans', phone: '+33-1-44-55-66-77', address: '15 Rue du Verre, 75001 Paris' },
  { name: 'Italian Glass Masters', email: 'info@italianglass.it', country: 'Italy', city: 'Milan', company: 'Italian Glass Masters', phone: '+39-02-1234-5678', address: 'Via del Vetro 88, 20121 Milano' },
  { name: 'Spanish Glass Works', email: 'ventas@spanishglass.es', country: 'Spain', city: 'Madrid', company: 'Spanish Glass Works', phone: '+34-91-555-0177', address: 'Calle del Cristal 25, 28001 Madrid' },
  { name: 'Dutch Glass Technologies', email: 'info@dutchglass.nl', country: 'Netherlands', city: 'Amsterdam', company: 'Dutch Glass Technologies', phone: '+31-20-555-0166', address: 'Glasstraat 67, 1012 Amsterdam' },
  { name: 'Swiss Precision Glass', email: 'orders@swissprecision.ch', country: 'Switzerland', city: 'Zurich', company: 'Swiss Precision Glass', phone: '+41-44-555-0155', address: 'Glasweg 34, 8001 Zürich' },
  { name: 'Russian Glass Industries', email: 'info@russianglass.ru', country: 'Russia', city: 'Moscow', company: 'Russian Glass Industries', phone: '+7-495-555-0144', address: 'Glass Avenue 56, Moscow 101000' },
  { name: 'Korean Glass Tech', email: 'sales@koreanglasstech.kr', country: 'South Korea', city: 'Seoul', company: 'Korean Glass Tech', phone: '+82-2-555-0133', address: '789 Glass-ro, Gangnam-gu, Seoul 06292' },
  { name: 'Singapore Glass Hub', email: 'contact@sgglass.sg', country: 'Singapore', city: 'Singapore', company: 'Singapore Glass Hub', phone: '+65-6555-0122', address: '123 Glass Street, Singapore 018956' },
  { name: 'Dubai Glass Emirates', email: 'info@dubaiglass.ae', country: 'UAE', city: 'Dubai', company: 'Dubai Glass Emirates', phone: '+971-4-555-0111', address: 'Glass Tower, Business Bay, Dubai' },
  { name: 'Cape Town Glass Co', email: 'orders@ctglass.za', country: 'South Africa', city: 'Cape Town', company: 'Cape Town Glass Co', phone: '+27-21-555-0100', address: '456 Glass Road, Cape Town 8001' },
];

async function main() {
  console.log('🌱 Starting to seed database...');

  // Create customers
  console.log('👥 Creating customers...');
  const createdCustomers = [];
  for (const customer of customers) {
    const created = await prisma.customer.create({
      data: customer,
    });
    createdCustomers.push(created);
  }
  console.log(`✅ Created ${createdCustomers.length} customers`);

  // Create orders
  console.log('📦 Creating orders...');
  const glassTypes = ['FLOAT', 'TEMPERED', 'LAMINATED', 'INSULATED', 'LOW_E', 'REFLECTIVE', 'TINTED', 'FROSTED', 'PATTERNED', 'BULLETPROOF'];
  const glassClasses = ['SINGLE_GLASS', 'IG_CLASS', 'DOUBLE_GLAZED', 'TRIPLE_GLAZED', 'SAFETY_GLASS', 'FIRE_RATED', 'ACOUSTIC', 'SOLAR_CONTROL'];
  const statuses = ['PENDING', 'CONFIRMED', 'IN_PRODUCTION', 'QUALITY_CHECK', 'READY_FOR_DELIVERY', 'DELIVERED', 'CANCELLED', 'ON_HOLD'];
  const priorities = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
  
  const orders = [];
  for (let i = 1; i <= 55; i++) {
    const customer = createdCustomers[Math.floor(Math.random() * createdCustomers.length)];
    const glassType = glassTypes[Math.floor(Math.random() * glassTypes.length)];
    const glassClass = glassClasses[Math.floor(Math.random() * glassClasses.length)];
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const priority = priorities[Math.floor(Math.random() * priorities.length)];
    
    const width = Math.floor(Math.random() * 2000) + 500; // 500-2500mm
    const height = Math.floor(Math.random() * 1500) + 400; // 400-1900mm
    const thickness = [4, 5, 6, 8, 10, 12, 15, 19][Math.floor(Math.random() * 8)];
    const quantity = Math.floor(Math.random() * 20) + 1;
    const unitPrice = Math.floor(Math.random() * 500) + 50;
    const totalPrice = unitPrice * quantity;
    
    const orderDate = new Date(2024, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1);
    const requiredDate = new Date(orderDate.getTime() + Math.random() * 30 * 24 * 60 * 60 * 1000); // 0-30 days later
    
    const order = await prisma.order.create({
      data: {
        orderNumber: `ORD-2024-${String(i).padStart(3, '0')}`,
        customerId: customer.id,
        glassType: glassType as any,
        glassClass: glassClass as any,
        thickness,
        width,
        height,
        quantity,
        unitPrice,
        totalPrice,
        currency: 'USD',
        status: status as any,
        priority: priority as any,
        tempering: Math.random() > 0.7,
        laminated: Math.random() > 0.8,
        orderDate,
        requiredDate,
        notes: ['Urgent delivery required', 'Standard quality check', 'Customer pickup', 'Special coating required', ''][Math.floor(Math.random() * 5)] || undefined,
        edgeWork: ['Polished', 'Ground', 'Beveled', 'Standard', ''][Math.floor(Math.random() * 5)] || undefined,
        coating: ['Low-E', 'Anti-reflective', 'Solar control', 'None', ''][Math.floor(Math.random() * 5)] || undefined,
      },
    });
    orders.push(order);
  }
  
  console.log(`✅ Created ${orders.length} orders`);
  
  // Print summary
  const totalRevenue = orders.reduce((sum, order) => sum + order.totalPrice, 0);
  console.log('\n📊 Database Summary:');
  console.log(`👥 Customers: ${createdCustomers.length}`);
  console.log(`📦 Orders: ${orders.length}`);
  console.log(`💰 Total Revenue: $${totalRevenue.toLocaleString()}`);
  console.log(`🌍 Countries: ${new Set(createdCustomers.map(c => c.country)).size}`);
  
  console.log('\n🎉 Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
