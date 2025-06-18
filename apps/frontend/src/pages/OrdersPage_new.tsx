import React, { useState, useEffect } from 'react';
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
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import { useNotification } from '../contexts/NotificationContext';
import { GlassType, GlassClass, OrderStatus, Priority } from '../types';
import { 
  useOrders, 
  useCustomers, 
  useCreateOrder, 
  useUpdateOrder, 
  useDeleteOrder,
  useGenerateOrderNumber 
} from '../hooks/useApi';

const OrdersPage = () => {
  const { showSuccess, showError, showInfo } = useNotification();
  
  // API hooks
  const { data: orders = [], isLoading: ordersLoading, error: ordersError } = useOrders();
  const { data: customers = [], isLoading: customersLoading } = useCustomers();
  const { data: newOrderNumber } = useGenerateOrderNumber();
  const createOrderMutation = useCreateOrder();
  const updateOrderMutation = useUpdateOrder();
  const deleteOrderMutation = useDeleteOrder();
  
  // Local state
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingOrder, setEditingOrder] = useState<any>(null);
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

  // Set order number when dialog opens
  useEffect(() => {
    if (open && newOrderNumber && !editingOrder) {
      setOrderForm(prev => ({ ...prev, orderNumber: newOrderNumber }));
    }
  }, [open, newOrderNumber, editingOrder]);

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

  // Filter orders based on search query
  const filteredOrders = orders.filter((order: any) =>
    order.orderNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    order.customer?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    order.glassType?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    order.customer?.country?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleStatusUpdate = async (orderId: string, newStatus: string, orderNumber: string) => {
    try {
      await updateOrderMutation.mutateAsync({
        id: orderId,
        data: { status: newStatus }
      });
      showSuccess(`Order ${orderNumber} status updated to ${newStatus.replace('_', ' ')}`);
    } catch (error) {
      console.error('Error updating order status:', error);
      showError('Failed to update order status. Please try again.');
    }
  };

  const handleEdit = (order: any) => {
    setEditingOrder(order);
    setOrderForm({
      orderNumber: order.orderNumber || '',
      customerId: order.customerId || '',
      glassType: order.glassType || GlassType.FLOAT,
      glassClass: order.glassClass || GlassClass.SINGLE_GLASS,
      thickness: order.thickness || 4,
      width: order.width || 1000,
      height: order.height || 600,
      quantity: order.quantity || 1,
      unitPrice: order.unitPrice || 100,
      priority: order.priority || Priority.MEDIUM,
      requiredDate: order.requiredDate || '',
      edgeWork: order.edgeWork || '',
      coating: order.coating || '',
      tempering: order.tempering || false,
      laminated: order.laminated || false,
      notes: order.notes || '',
    });
    setOpen(true);
  };

  const handleDelete = async (orderId: string, orderNumber: string) => {
    if (window.confirm(`Are you sure you want to delete order ${orderNumber}?`)) {
      try {
        await deleteOrderMutation.mutateAsync(orderId);
        showSuccess(`Order ${orderNumber} deleted successfully`);
      } catch (error) {
        console.error('Error deleting order:', error);
        showError('Failed to delete order. Please try again.');
      }
    }
  };

  const handleSubmit = async () => {
    try {
      const totalPrice = orderForm.unitPrice * orderForm.quantity;
      
      const orderData = {
        ...orderForm,
        totalPrice,
        orderDate: new Date().toISOString().split('T')[0],
      };

      if (editingOrder) {
        await updateOrderMutation.mutateAsync({
          id: editingOrder.id,
          data: orderData
        });
        showSuccess(`Order ${orderForm.orderNumber} updated successfully!`);
      } else {
        await createOrderMutation.mutateAsync(orderData);
        showSuccess(`Order ${orderForm.orderNumber} created successfully!`);
      }
      
      handleCloseDialog();
    } catch (error) {
      console.error('Error saving order:', error);
      showError('Failed to save order. Please try again.');
    }
  };

  const handleCloseDialog = () => {
    setOpen(false);
    setEditingOrder(null);
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

  // Loading state
  if (ordersLoading || customersLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress size={60} />
      </Box>
    );
  }

  // Error state
  if (ordersError) {
    return (
      <Container maxWidth="xl" sx={{ mt: 4 }}>
        <Alert severity="error">
          Error loading orders: {ordersError.message}. Please check if the backend is running.
        </Alert>
      </Container>
    );
  }

  // Calculate summary stats
  const totalOrders = orders.length;
  const pendingOrders = orders.filter((o: any) => o.status === 'PENDING').length;
  const deliveredOrders = orders.filter((o: any) => o.status === 'DELIVERED').length;
  const totalCustomers = customers.length;

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
            disabled={createOrderMutation.isPending}
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
              <Typography variant="h4" color="primary">{totalOrders}</Typography>
              <Typography variant="body2">Total Orders</Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={3}>
            <Paper sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="h4" color="info.main">{pendingOrders}</Typography>
              <Typography variant="body2">Pending Orders</Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={3}>
            <Paper sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="h4" color="success.main">{deliveredOrders}</Typography>
              <Typography variant="body2">Delivered</Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={3}>
            <Paper sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="h4" color="secondary.main">{totalCustomers}</Typography>
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
              {filteredOrders.slice(0, 20).map((order: any) => (
                <TableRow key={order.id} hover>
                  <TableCell><strong>{order.orderNumber}</strong></TableCell>
                  <TableCell>{order.customer?.name || 'Unknown'}</TableCell>
                  <TableCell>{order.customer?.country || 'N/A'}</TableCell>
                  <TableCell>{order.glassType?.replace('_', ' ') || 'N/A'}</TableCell>
                  <TableCell>{order.glassClass?.replace('_', ' ') || 'N/A'}</TableCell>
                  <TableCell>
                    {order.width} × {order.height} × {order.thickness}mm
                  </TableCell>
                  <TableCell>{order.quantity}</TableCell>
                  <TableCell>
                    <strong>{order.currency || 'USD'} {order.totalPrice?.toLocaleString() || '0'}</strong>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={order.status || 'PENDING'}
                      size="small"
                      onChange={(e) => handleStatusUpdate(order.id, e.target.value, order.orderNumber)}
                      sx={{ minWidth: 140 }}
                      disabled={updateOrderMutation.isPending}
                    >
                      <MenuItem value="PENDING">Pending</MenuItem>
                      <MenuItem value="CONFIRMED">Confirmed</MenuItem>
                      <MenuItem value="IN_PRODUCTION">In Production</MenuItem>
                      <MenuItem value="QUALITY_CHECK">Quality Check</MenuItem>
                      <MenuItem value="READY_FOR_DELIVERY">Ready for Delivery</MenuItem>
                      <MenuItem value="DELIVERED">Delivered</MenuItem>
                      <MenuItem value="ON_HOLD">On Hold</MenuItem>
                      <MenuItem value="CANCELLED">Cancelled</MenuItem>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={order.priority || 'MEDIUM'}
                      color={getPriorityColor(order.priority)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{order.requiredDate || 'N/A'}</TableCell>
                  <TableCell>
                    <IconButton size="small" onClick={() => handleEdit(order)}>
                      <EditIcon />
                    </IconButton>
                    <IconButton 
                      size="small" 
                      color="error" 
                      onClick={() => handleDelete(order.id, order.orderNumber)}
                      disabled={deleteOrderMutation.isPending}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {filteredOrders.length === 0 && (
          <Typography variant="body1" sx={{ mt: 2, textAlign: 'center' }}>
            No orders found. {orders.length === 0 ? 'Create your first order!' : 'Try adjusting your search.'}
          </Typography>
        )}

        {filteredOrders.length > 20 && (
          <Typography variant="body2" sx={{ mt: 2, textAlign: 'center' }}>
            Showing 20 of {filteredOrders.length} orders. Use search to filter results.
          </Typography>
        )}

        {/* Create/Edit Order Dialog */}
        <Dialog open={open} onClose={handleCloseDialog} maxWidth="md" fullWidth>
          <DialogTitle>
            {editingOrder ? 'Edit Order' : 'Create New Glass Order'}
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={3} sx={{ mt: 1 }}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Order Number"
                  value={orderForm.orderNumber}
                  onChange={(e) => setOrderForm({...orderForm, orderNumber: e.target.value})}
                  disabled={!!editingOrder}
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
                    {customers.map((customer: any) => (
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

              {/* Total Price Display */}
              <Grid item xs={12}>
                <Paper sx={{ p: 2, bgcolor: 'background.default' }}>
                  <Typography variant="h6">
                    Total Price: ${(orderForm.unitPrice * orderForm.quantity).toLocaleString()}
                  </Typography>
                </Paper>
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancel</Button>
            <Button 
              onClick={handleSubmit} 
              variant="contained"
              disabled={createOrderMutation.isPending || updateOrderMutation.isPending}
            >
              {editingOrder ? 'Update Order' : 'Create Order'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Container>
  );
};

export default OrdersPage;
