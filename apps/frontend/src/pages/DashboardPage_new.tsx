import React from 'react';
import { 
  Box, 
  Typography, 
  Grid, 
  Card, 
  CardContent, 
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  LinearProgress,
} from '@mui/material';
import { 
  People, 
  Assignment, 
  TrendingUp, 
  AttachMoney,
  Public,
  Schedule,
  CheckCircle,
  Warning,
} from '@mui/icons-material';

// Mock data matching OrdersPage
const mockCustomers = [
  { id: '1', name: 'Acme Glass Co', email: 'orders@acmeglass.com', country: 'United States', city: 'New York' },
  { id: '2', name: 'Glass Solutions Ltd', email: 'info@glasssolutions.com', country: 'United Kingdom', city: 'London' },
  { id: '3', name: 'Crystal Clear Inc', email: 'sales@crystalclear.com', country: 'Canada', city: 'Toronto' },
  { id: '4', name: 'Premium Glass Works', email: 'orders@premiumglass.com', country: 'Australia', city: 'Sydney' },
  { id: '5', name: 'Euro Glass Manufacturing', email: 'contact@euroglass.de', country: 'Germany', city: 'Berlin' },
  { id: '6', name: 'Tokyo Glass Industries', email: 'info@tokyoglass.jp', country: 'Japan', city: 'Tokyo' },
  { id: '7', name: 'Shanghai Glazing Co', email: 'orders@shanghaiglazing.cn', country: 'China', city: 'Shanghai' },
  { id: '8', name: 'Mumbai Glass Solutions', email: 'sales@mumbaiglass.in', country: 'India', city: 'Mumbai' },
  { id: '9', name: 'São Paulo Vidros', email: 'contato@spvidros.br', country: 'Brazil', city: 'São Paulo' },
  { id: '10', name: 'Nordic Glass AB', email: 'info@nordicglass.se', country: 'Sweden', city: 'Stockholm' },
  { id: '11', name: 'French Glass Artisans', email: 'contact@frenchglass.fr', country: 'France', city: 'Paris' },
  { id: '12', name: 'Italian Glass Masters', email: 'info@italianglass.it', country: 'Italy', city: 'Milan' },
  { id: '13', name: 'Spanish Glass Works', email: 'ventas@spanishglass.es', country: 'Spain', city: 'Madrid' },
  { id: '14', name: 'Dutch Glass Technologies', email: 'info@dutchglass.nl', country: 'Netherlands', city: 'Amsterdam' },
  { id: '15', name: 'Swiss Precision Glass', email: 'orders@swissprecision.ch', country: 'Switzerland', city: 'Zurich' },
  { id: '16', name: 'Russian Glass Industries', email: 'info@russianglass.ru', country: 'Russia', city: 'Moscow' },
  { id: '17', name: 'Korean Glass Tech', email: 'sales@koreanglasstech.kr', country: 'South Korea', city: 'Seoul' },
  { id: '18', name: 'Singapore Glass Hub', email: 'contact@sgglass.sg', country: 'Singapore', city: 'Singapore' },
  { id: '19', name: 'Dubai Glass Emirates', email: 'info@dubaiglass.ae', country: 'UAE', city: 'Dubai' },
  { id: '20', name: 'Cape Town Glass Co', email: 'orders@ctglass.za', country: 'South Africa', city: 'Cape Town' },
];

// Generate mock orders data for analytics
const generateMockOrders = () => {
  const orders = [];
  const statuses = ['PENDING', 'CONFIRMED', 'IN_PRODUCTION', 'QUALITY_CHECK', 'READY_FOR_DELIVERY', 'DELIVERED', 'CANCELLED', 'ON_HOLD'];
  const priorities = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
  
  for (let i = 1; i <= 55; i++) {
    const customer = mockCustomers[Math.floor(Math.random() * mockCustomers.length)];
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const priority = priorities[Math.floor(Math.random() * priorities.length)];
    
    const quantity = Math.floor(Math.random() * 20) + 1;
    const unitPrice = Math.floor(Math.random() * 500) + 50;
    const totalPrice = unitPrice * quantity;
    
    orders.push({
      id: i.toString(),
      orderNumber: `ORD-2024-${String(i).padStart(3, '0')}`,
      customerId: customer.id,
      customer: customer,
      quantity,
      unitPrice,
      totalPrice,
      currency: 'USD',
      status,
      priority,
      orderDate: new Date(2024, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1).toISOString().split('T')[0],
      requiredDate: new Date(2024, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1).toISOString().split('T')[0],
    });
  }
  
  return orders;
};

const mockOrders = generateMockOrders();

const DashboardPage = () => {
  const totalRevenue = mockOrders.reduce((sum, order) => sum + order.totalPrice, 0);
  const pendingOrders = mockOrders.filter(order => order.status === 'PENDING').length;
  const deliveredOrders = mockOrders.filter(order => order.status === 'DELIVERED').length;
  const inProductionOrders = mockOrders.filter(order => order.status === 'IN_PRODUCTION').length;
  const urgentOrders = mockOrders.filter(order => order.priority === 'URGENT').length;

  // Country-wise order distribution
  const countryStats = mockOrders.reduce((acc, order) => {
    const country = order.customer.country;
    if (!acc[country]) {
      acc[country] = { orders: 0, revenue: 0 };
    }
    acc[country].orders++;
    acc[country].revenue += order.totalPrice;
    return acc;
  }, {} as Record<string, { orders: number; revenue: number }>);

  const topCountries = Object.entries(countryStats)
    .sort(([,a], [,b]) => b.revenue - a.revenue)
    .slice(0, 10);

  // Status distribution
  const statusStats = mockOrders.reduce((acc, order) => {
    acc[order.status] = (acc[order.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Recent orders
  const recentOrders = mockOrders
    .sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime())
    .slice(0, 5);

  const StatCard = ({ 
    title, 
    value, 
    icon, 
    color = 'primary',
    subtitle 
  }: {
    title: string;
    value: string | number;
    icon: React.ReactNode;
    color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';
    subtitle?: string;
  }) => (
    <Card sx={{ 
      height: '100%', 
      transition: 'all 0.3s ease',
      '&:hover': { 
        transform: 'translateY(-4px)',
        boxShadow: '0 8px 25px rgba(0,0,0,0.15)'
      } 
    }}>
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box>
            <Typography color="textSecondary" gutterBottom variant="body2" fontWeight="medium">
              {title}
            </Typography>
            <Typography variant="h4" component="h2" color={`${color}.main`} fontWeight="bold">
              {value}
            </Typography>
            {subtitle && (
              <Typography variant="body2" color="textSecondary">
                {subtitle}
              </Typography>
            )}
          </Box>
          <Box color={`${color}.main`} sx={{ fontSize: 48, opacity: 0.8 }}>
            {icon}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'warning';
      case 'CONFIRMED': return 'info';
      case 'IN_PRODUCTION': return 'primary';
      case 'QUALITY_CHECK': return 'secondary';
      case 'READY_FOR_DELIVERY': return 'success';
      case 'DELIVERED': return 'success';
      case 'CANCELLED': return 'error';
      case 'ON_HOLD': return 'default';
      default: return 'default';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'LOW': return 'success';
      case 'MEDIUM': return 'info';
      case 'HIGH': return 'warning';
      case 'URGENT': return 'error';
      default: return 'default';
    }
  };

  return (
    <Box>
      {/* Hero Welcome Section */}
      <Box sx={{ 
        mb: 6, 
        p: 5, 
        borderRadius: 3, 
        background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
        color: 'white',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 8px 32px rgba(25, 118, 210, 0.3)'
      }}>
        <Box sx={{ position: 'relative', zIndex: 1 }}>
          <Typography variant="h2" component="h1" gutterBottom sx={{ 
            fontWeight: 'bold', 
            mb: 2,
            fontSize: { xs: '2.5rem', md: '3.5rem' }
          }}>
            Welcome to Glass Order Management System
          </Typography>
          <Typography variant="h5" sx={{ mb: 4, opacity: 0.9, maxWidth: '800px' }}>
            Your comprehensive solution for managing glass orders worldwide with real-time analytics and global reach
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
            <Chip 
              icon={<Public />} 
              label={`${mockCustomers.length} Countries`} 
              sx={{ 
                bgcolor: 'rgba(255,255,255,0.2)', 
                color: 'white', 
                fontWeight: 'bold',
                fontSize: '1rem',
                height: 40
              }}
            />
            <Chip 
              icon={<Assignment />} 
              label={`${mockOrders.length} Orders`} 
              sx={{ 
                bgcolor: 'rgba(255,255,255,0.2)', 
                color: 'white', 
                fontWeight: 'bold',
                fontSize: '1rem',
                height: 40
              }}
            />
            <Chip 
              icon={<AttachMoney />} 
              label={`$${totalRevenue.toLocaleString()} Revenue`} 
              sx={{ 
                bgcolor: 'rgba(255,255,255,0.2)', 
                color: 'white', 
                fontWeight: 'bold',
                fontSize: '1rem',
                height: 40
              }}
            />
          </Box>
        </Box>
        {/* Decorative elements */}
        <Box sx={{ 
          position: 'absolute', 
          top: -50, 
          right: -50, 
          width: 200, 
          height: 200, 
          borderRadius: '50%', 
          bgcolor: 'rgba(255,255,255,0.1)' 
        }} />
        <Box sx={{ 
          position: 'absolute', 
          bottom: -30, 
          left: -30, 
          width: 150, 
          height: 150, 
          borderRadius: '50%', 
          bgcolor: 'rgba(255,255,255,0.05)' 
        }} />
      </Box>
      
      {/* Key Performance Metrics */}
      <Box sx={{ mb: 6 }}>
        <Typography variant="h4" component="h2" gutterBottom sx={{ 
          fontWeight: 'bold', 
          mb: 3,
          color: 'text.primary'
        }}>
          📊 Key Performance Metrics
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Total Orders"
              value={mockOrders.length}
              icon={<Assignment />}
              color="primary"
              subtitle="All time"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Total Revenue"
              value={`$${totalRevenue.toLocaleString()}`}
              icon={<AttachMoney />}
              color="success"
              subtitle="USD"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Active Customers"
              value={mockCustomers.length}
              icon={<People />}
              color="info"
              subtitle="Worldwide"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Pending Orders"
              value={pendingOrders}
              icon={<Schedule />}
              color="warning"
              subtitle="Needs attention"
            />
          </Grid>
        </Grid>
      </Box>

      {/* Operations Overview */}
      <Box sx={{ mb: 6 }}>
        <Typography variant="h4" component="h2" gutterBottom sx={{ 
          fontWeight: 'bold', 
          mb: 3,
          color: 'text.primary'
        }}>
          🏭 Operations Overview
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="In Production"
              value={inProductionOrders}
              icon={<TrendingUp />}
              color="primary"
              subtitle="Active manufacturing"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Delivered"
              value={deliveredOrders}
              icon={<CheckCircle />}
              color="success"
              subtitle="Completed orders"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Urgent Orders"
              value={urgentOrders}
              icon={<Warning />}
              color="error"
              subtitle="High priority"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Countries Served"
              value={Object.keys(countryStats).length}
              icon={<Public />}
              color="secondary"
              subtitle="Global reach"
            />
          </Grid>
        </Grid>
      </Box>

      {/* Business Analytics Section */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h2" gutterBottom sx={{ 
          fontWeight: 'bold', 
          mb: 1,
          color: 'text.primary'
        }}>
          📈 Business Analytics
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          Detailed insights into your glass order operations and performance metrics
        </Typography>
        
        <Grid container spacing={4}>
          {/* Top Countries by Revenue */}
          <Grid item xs={12} lg={6}>
            <Card sx={{ 
              height: '100%',
              transition: 'all 0.3s ease',
              '&:hover': { boxShadow: '0 8px 25px rgba(0,0,0,0.15)' }
            }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom color="primary" fontWeight="bold" sx={{ mb: 3 }}>
                  🌍 Top Countries by Revenue
                </Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell><strong>Country</strong></TableCell>
                        <TableCell align="center"><strong>Orders</strong></TableCell>
                        <TableCell align="right"><strong>Revenue</strong></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {topCountries.map(([country, stats], index) => (
                        <TableRow key={country} hover>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Box sx={{ 
                                width: 6, 
                                height: 6, 
                                borderRadius: '50%', 
                                bgcolor: index < 3 ? 'primary.main' : 'grey.400' 
                              }} />
                              {country}
                            </Box>
                          </TableCell>
                          <TableCell align="center">
                            <Chip 
                              label={stats.orders} 
                              size="small" 
                              color="primary" 
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2" fontWeight="bold" color="success.main">
                              ${stats.revenue.toLocaleString()}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* Order Status Distribution */}
          <Grid item xs={12} lg={6}>
            <Card sx={{ 
              height: '100%',
              transition: 'all 0.3s ease',
              '&:hover': { boxShadow: '0 8px 25px rgba(0,0,0,0.15)' }
            }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom color="primary" fontWeight="bold" sx={{ mb: 3 }}>
                  📋 Order Status Distribution
                </Typography>
                <Box sx={{ mt: 2 }}>
                  {Object.entries(statusStats).map(([status, count]) => (
                    <Box key={status} sx={{ mb: 3 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="body2" fontWeight="medium">
                          {status.replace('_', ' ')}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" fontWeight="bold">
                          {count} ({Math.round((count / mockOrders.length) * 100)}%)
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={(count / mockOrders.length) * 100}
                        color={getStatusColor(status) as any}
                        sx={{ 
                          height: 10, 
                          borderRadius: 2,
                          bgcolor: 'grey.200'
                        }}
                      />
                    </Box>
                  ))}
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Recent Orders */}
          <Grid item xs={12}>
            <Card sx={{
              transition: 'all 0.3s ease',
              '&:hover': { boxShadow: '0 8px 25px rgba(0,0,0,0.15)' }
            }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom color="primary" fontWeight="bold" sx={{ mb: 3 }}>
                  🕒 Recent Orders
                </Typography>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell><strong>Order Number</strong></TableCell>
                        <TableCell><strong>Customer</strong></TableCell>
                        <TableCell><strong>Country</strong></TableCell>
                        <TableCell align="right"><strong>Amount</strong></TableCell>
                        <TableCell><strong>Status</strong></TableCell>
                        <TableCell><strong>Priority</strong></TableCell>
                        <TableCell><strong>Order Date</strong></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {recentOrders.map((order) => (
                        <TableRow key={order.id} hover sx={{ '&:hover': { bgcolor: 'action.hover' } }}>
                          <TableCell>
                            <Typography variant="body2" fontWeight="bold" color="primary">
                              {order.orderNumber}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {order.customer.name}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {order.customer.country}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2" fontWeight="bold" color="success.main">
                              ${order.totalPrice.toLocaleString()}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={order.status.replace('_', ' ')}
                              color={getStatusColor(order.status) as any}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={order.priority}
                              color={getPriorityColor(order.priority) as any}
                              size="small"
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" color="text.secondary">
                              {order.orderDate}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
};

export default DashboardPage;
