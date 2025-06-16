import React, { useState } from 'react';
import {
  Box,
  Button,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Chip,
  FormControl,
  InputLabel,
  FormControlLabel,
  Switch,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import { GlassType, GlassClass, OrderStatus, Priority } from '../types';

// Rich mock data with 55+ orders and 20 worldwide customers
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

const generateMockOrders = () => {
  const orders = [];
  const glassTypes = Object.values(GlassType);
  const glassClasses = Object.values(GlassClass);
  const statuses = Object.values(OrderStatus);
  const priorities = Object.values(Priority);
  
  for (let i = 1; i <= 55; i++) {
    const customer = mockCustomers[Math.floor(Math.random() * mockCustomers.length)];
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
    
    orders.push({
      id: i.toString(),
      orderNumber: `ORD-2024-${String(i).padStart(3, '0')}`,
      customerId: customer.id,
      customer: customer,
      glassType,
      glassClass,
      thickness,
      width,
      height,
      quantity,
      unitPrice,
      totalPrice,
      currency: 'USD',
      status,
      priority,
      tempering: Math.random() > 0.7,
      laminated: Math.random() > 0.8,
      orderDate: new Date(2024, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1).toISOString().split('T')[0],
      requiredDate: new Date(2024, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1).toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      notes: ['Urgent delivery required', 'Standard quality check', 'Customer pickup', 'Special coating required', ''][Math.floor(Math.random() * 5)],
      edgeWork: ['Polished', 'Ground', 'Beveled', 'Standard', ''][Math.floor(Math.random() * 5)],
      coating: ['Low-E', 'Anti-reflective', 'Solar control', 'None', ''][Math.floor(Math.random() * 5)],
    });
  }
  
  return orders;
};

const mockOrders = generateMockOrders();

const OrdersPage = () => {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [orderForm, setOrderForm] = useState({
    orderNumber: '',
    customerId: '',
    glassType: GlassType.FLOAT,
    glassClass: GlassClass.SINGLE_GLASS,
    thickness: 4,
    width: 1000,
    height: 600,
    quantity: 1,
    unitPrice: 100,
    priority: Priority.MEDIUM,
    requiredDate: '',
    edgeWork: '',
    coating: '',
    tempering: false,
    laminated: false,
    notes: '',
  });

  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case OrderStatus.PENDING: return 'warning';
      case OrderStatus.CONFIRMED: return 'info';
      case OrderStatus.IN_PRODUCTION: return 'primary';
      case OrderStatus.QUALITY_CHECK: return 'secondary';
      case OrderStatus.READY_FOR_DELIVERY: return 'success';
      case OrderStatus.DELIVERED: return 'success';
      case OrderStatus.CANCELLED: return 'error';
      case OrderStatus.ON_HOLD: return 'default';
      default: return 'default';
    }
  };

  const getPriorityColor = (priority: Priority) => {
    switch (priority) {
      case Priority.LOW: return 'success';
      case Priority.MEDIUM: return 'info';
      case Priority.HIGH: return 'warning';
      case Priority.URGENT: return 'error';
      default: return 'default';
    }
  };

  const filteredOrders = mockOrders.filter(order =>
    order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    order.customer?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    order.glassType.toLowerCase().includes(searchQuery.toLowerCase()) ||
    order.customer?.country.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSubmit = () => {
    const totalPrice = orderForm.unitPrice * orderForm.quantity;
    console.log('Creating order with total price:', totalPrice);
    setOpen(false);
    
    // Reset form
    setOrderForm({
      orderNumber: '',
      customerId: '',
      glassType: GlassType.FLOAT,
      glassClass: GlassClass.SINGLE_GLASS,
      thickness: 4,
      width: 1000,
      height: 600,
      quantity: 1,
      unitPrice: 100,
      priority: Priority.MEDIUM,
      requiredDate: '',
      edgeWork: '',
      coating: '',
      tempering: false,
      laminated: false,
      notes: '',
    });
  };

  return (
    <Container maxWidth="xl">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" component="h1">
            Glass Orders Management
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setOpen(true)}
          >
            New Order
          </Button>
        </Box>

        {/* Search */}
        <Box sx={{ mb: 3 }}>
          <TextField
            fullWidth
            placeholder="Search orders by number, customer, glass type, or country..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: <SearchIcon sx={{ mr: 1, color: 'action.active' }} />,
            }}
          />
        </Box>

        {/* Summary Cards */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={3}>
            <Paper sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="h4" color="primary">{mockOrders.length}</Typography>
              <Typography variant="body2">Total Orders</Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={3}>
            <Paper sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="h4" color="info.main">{mockOrders.filter(o => o.status === OrderStatus.PENDING).length}</Typography>
              <Typography variant="body2">Pending Orders</Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={3}>
            <Paper sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="h4" color="success.main">{mockOrders.filter(o => o.status === OrderStatus.DELIVERED).length}</Typography>
              <Typography variant="body2">Delivered</Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={3}>
            <Paper sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="h4" color="secondary.main">{mockCustomers.length}</Typography>
              <Typography variant="body2">Active Customers</Typography>
            </Paper>
          </Grid>
        </Grid>

        {/* Orders Table */}
        <TableContainer component={Paper} sx={{ maxHeight: 600 }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>Order Number</TableCell>
                <TableCell>Customer</TableCell>
                <TableCell>Country</TableCell>
                <TableCell>Glass Type</TableCell>
                <TableCell>Glass Class</TableCell>
                <TableCell>Dimensions</TableCell>
                <TableCell>Qty</TableCell>
                <TableCell>Total Price</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Priority</TableCell>
                <TableCell>Required Date</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredOrders.slice(0, 20).map((order) => (
                <TableRow key={order.id} hover>
                  <TableCell><strong>{order.orderNumber}</strong></TableCell>
                  <TableCell>{order.customer?.name}</TableCell>
                  <TableCell>{order.customer?.country}</TableCell>
                  <TableCell>{order.glassType.replace('_', ' ')}</TableCell>
                  <TableCell>{order.glassClass.replace('_', ' ')}</TableCell>
                  <TableCell>
                    {order.width} × {order.height} × {order.thickness}mm
                  </TableCell>
                  <TableCell>{order.quantity}</TableCell>
                  <TableCell>
                    <strong>{order.currency} {order.totalPrice.toLocaleString()}</strong>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={order.status.replace('_', ' ')}
                      color={getStatusColor(order.status)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={order.priority}
                      color={getPriorityColor(order.priority)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{order.requiredDate}</TableCell>
                  <TableCell>
                    <IconButton size="small">
                      <EditIcon />
                    </IconButton>
                    <IconButton size="small" color="error">
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {filteredOrders.length > 20 && (
          <Typography variant="body2" sx={{ mt: 2, textAlign: 'center' }}>
            Showing 20 of {filteredOrders.length} orders. Use search to filter results.
          </Typography>
        )}

        {/* Create Order Dialog */}
        <Dialog open={open} onClose={() => setOpen(false)} maxWidth="md" fullWidth>
          <DialogTitle>Create New Glass Order</DialogTitle>
          <DialogContent>
            <Grid container spacing={3} sx={{ mt: 1 }}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Order Number"
                  value={orderForm.orderNumber}
                  onChange={(e) => setOrderForm({...orderForm, orderNumber: e.target.value})}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Customer</InputLabel>
                  <Select
                    value={orderForm.customerId}
                    onChange={(e) => setOrderForm({...orderForm, customerId: e.target.value})}
                    label="Customer"
                  >
                    {mockCustomers.map((customer) => (
                      <MenuItem key={customer.id} value={customer.id}>
                        {customer.name} - {customer.country}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Glass Type</InputLabel>
                  <Select
                    value={orderForm.glassType}
                    onChange={(e) => setOrderForm({...orderForm, glassType: e.target.value as GlassType})}
                    label="Glass Type"
                  >
                    {Object.values(GlassType).map((type) => (
                      <MenuItem key={type} value={type}>
                        {type.replace('_', ' ')}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Glass Class</InputLabel>
                  <Select
                    value={orderForm.glassClass}
                    onChange={(e) => setOrderForm({...orderForm, glassClass: e.target.value as GlassClass})}
                    label="Glass Class"
                  >
                    {Object.values(GlassClass).map((cls) => (
                      <MenuItem key={cls} value={cls}>
                        {cls.replace('_', ' ')}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Width (mm)"
                  type="number"
                  value={orderForm.width}
                  onChange={(e) => setOrderForm({...orderForm, width: Number(e.target.value)})}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Height (mm)"
                  type="number"
                  value={orderForm.height}
                  onChange={(e) => setOrderForm({...orderForm, height: Number(e.target.value)})}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Thickness (mm)"
                  type="number"
                  value={orderForm.thickness}
                  onChange={(e) => setOrderForm({...orderForm, thickness: Number(e.target.value)})}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Quantity"
                  type="number"
                  value={orderForm.quantity}
                  onChange={(e) => setOrderForm({...orderForm, quantity: Number(e.target.value)})}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Unit Price (USD)"
                  type="number"
                  value={orderForm.unitPrice}
                  onChange={(e) => setOrderForm({...orderForm, unitPrice: Number(e.target.value)})}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Priority</InputLabel>
                  <Select
                    value={orderForm.priority}
                    onChange={(e) => setOrderForm({...orderForm, priority: e.target.value as Priority})}
                    label="Priority"
                  >
                    {Object.values(Priority).map((priority) => (
                      <MenuItem key={priority} value={priority}>
                        {priority}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Required Date"
                  type="date"
                  value={orderForm.requiredDate}
                  onChange={(e) => setOrderForm({...orderForm, requiredDate: e.target.value})}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Edge Work"
                  value={orderForm.edgeWork}
                  onChange={(e) => setOrderForm({...orderForm, edgeWork: e.target.value})}
                  placeholder="e.g., Polished, Ground, Beveled"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Coating"
                  value={orderForm.coating}
                  onChange={(e) => setOrderForm({...orderForm, coating: e.target.value})}
                  placeholder="e.g., Low-E, Anti-reflective"
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={orderForm.tempering}
                      onChange={(e) => setOrderForm({...orderForm, tempering: e.target.checked})}
                    />
                  }
                  label="Tempering Required"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={orderForm.laminated}
                      onChange={(e) => setOrderForm({...orderForm, laminated: e.target.checked})}
                    />
                  }
                  label="Laminated Glass"
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Notes"
                  multiline
                  rows={3}
                  value={orderForm.notes}
                  onChange={(e) => setOrderForm({...orderForm, notes: e.target.value})}
                  placeholder="Any special requirements or notes..."
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} variant="contained">
              Create Order
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Container>
  );
};

export default OrdersPage;
