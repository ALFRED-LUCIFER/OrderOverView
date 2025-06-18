import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Card,
  CardContent,
  Grid,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  LinearProgress,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Psychology as AIIcon,
  RecordVoiceOver as VoiceIcon,
  Cloud as CloudIcon,
  Memory as ProcessorIcon,
  Api as ApiIcon,
  Architecture as ArchitectureIcon,
  Web as WebIcon,
  Storage as DatabaseIcon,
  Hub as IntegrationIcon,
  Speed as PerformanceIcon,
  Security as SecurityIcon,
} from '@mui/icons-material';

const TechStackPage: React.FC = () => {
  const aiModels = [
    {
      name: 'OpenAI Whisper',
      type: 'Speech-to-Text',
      provider: 'OpenAI',
      usage: 'Primary STT for enhanced voice recognition',
      accuracy: '95%',
      languages: '99+',
      features: ['Real-time transcription', 'Multi-language support', 'Noise reduction']
    },
    {
      name: 'Deepgram Nova',
      type: 'Speech-to-Text',
      provider: 'Deepgram',
      usage: 'Fallback STT provider with streaming capabilities',
      accuracy: '94%',
      languages: '30+',
      features: ['Streaming transcription', 'Speaker diarization', 'Custom vocabulary']
    },
    {
      name: 'GPT-4o',
      type: 'Intent Detection & NLP',
      provider: 'OpenAI',
      usage: 'Advanced intent detection with emotional intelligence',
      accuracy: '92%',
      languages: '50+',
      features: ['Context awareness', 'Emotion detection', 'Multi-turn conversations']
    },
    {
      name: 'Claude 3.5 Sonnet',
      type: 'Intent Detection & Analysis',
      provider: 'Anthropic',
      usage: 'Secondary intent detection for ensemble approach',
      accuracy: '90%',
      languages: '20+',
      features: ['Analytical reasoning', 'Safety filtering', 'Code understanding']
    },
    {
      name: 'Llama 3.3 70B',
      type: 'Conversational AI',
      provider: 'Groq',
      usage: 'Natural conversation and response generation',
      accuracy: '88%',
      languages: '15+',
      features: ['Fast inference', 'Conversational flow', 'Context retention']
    }
  ];

  const techStack = [
    {
      category: 'Frontend',
      icon: <WebIcon />,
      technologies: [
        { name: 'React 18', version: '18.x', purpose: 'UI Framework' },
        { name: 'TypeScript', version: '5.x', purpose: 'Type Safety' },
        { name: 'Material-UI', version: '5.x', purpose: 'Component Library' },
        { name: 'Vite', version: '5.x', purpose: 'Build Tool' },
        { name: 'Web Audio API', version: 'Native', purpose: 'Audio Processing' },
        { name: 'MediaRecorder API', version: 'Native', purpose: 'Audio Capture' },
      ]
    },
    {
      category: 'Backend',
      icon: <ApiIcon />,
      technologies: [
        { name: 'NestJS', version: '10.x', purpose: 'API Framework' },
        { name: 'Node.js', version: '22.x', purpose: 'Runtime' },
        { name: 'Socket.IO', version: '4.x', purpose: 'Real-time Communication' },
        { name: 'Prisma', version: '6.x', purpose: 'Database ORM' },
        { name: 'Express', version: '4.x', purpose: 'HTTP Server' },
      ]
    },
    {
      category: 'AI & Voice',
      icon: <AIIcon />,
      technologies: [
        { name: 'OpenAI API', version: 'v1', purpose: 'STT & Intent Detection' },
        { name: 'Deepgram API', version: 'v1', purpose: 'Streaming STT' },
        { name: 'Anthropic API', version: 'v1', purpose: 'Intent Analysis' },
        { name: 'Groq API', version: 'v1', purpose: 'Fast LLM Inference' },
        { name: 'ElevenLabs API', version: 'v1', purpose: 'Text-to-Speech' },
      ]
    },
    {
      category: 'Database & Storage',
      icon: <DatabaseIcon />,
      technologies: [
        { name: 'PostgreSQL', version: '15.x', purpose: 'Primary Database' },
        { name: 'Supabase', version: 'Cloud', purpose: 'Database Hosting' },
        { name: 'File System', version: 'Native', purpose: 'PDF Storage' },
      ]
    },
    {
      category: 'Infrastructure',
      icon: <CloudIcon />,
      technologies: [
        { name: 'Vercel', version: 'Cloud', purpose: 'Frontend Hosting' },
        { name: 'Render', version: 'Cloud', purpose: 'Backend Hosting' },
        { name: 'PNPM', version: '9.x', purpose: 'Package Management' },
        { name: 'Monorepo', version: 'Custom', purpose: 'Code Organization' },
      ]
    }
  ];

  const architectureFlow = [
    { step: 1, component: 'User Speech', description: 'User speaks into microphone' },
    { step: 2, component: 'VAD (Voice Activity Detection)', description: 'Real-time speech detection and audio analysis' },
    { step: 3, component: 'Audio Capture', description: 'MediaRecorder API captures high-quality audio' },
    { step: 4, component: 'Enhanced STT', description: 'Whisper/Deepgram transcribes speech to text' },
    { step: 5, component: 'Intent Detection', description: 'GPT-4o/Claude analyzes intent and context' },
    { step: 6, component: 'Business Logic', description: 'NestJS processes request and executes actions' },
    { step: 7, component: 'Database Operations', description: 'Prisma ORM interacts with PostgreSQL' },
    { step: 8, component: 'Response Generation', description: 'Llama 3.3 generates natural response' },
    { step: 9, component: 'Text-to-Speech', description: 'ElevenLabs converts text to natural speech' },
    { step: 10, component: 'Audio Playback', description: 'Browser plays response audio to user' },
  ];

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h3" component="h1" gutterBottom sx={{ fontWeight: 'bold', mb: 2 }}>
          🏗️ LISA Tech Stack & Architecture
        </Typography>
        <Typography variant="h6" color="text.secondary" sx={{ mb: 3 }}>
          Comprehensive overview of AI models, technologies, and system architecture powering the Enhanced Voice System
        </Typography>
        
        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="body2">
            <strong>LISA (Language Intelligence Support Assistant)</strong> uses cutting-edge AI models and modern web technologies 
            to provide intelligent voice interactions for glass order management.
          </Typography>
        </Alert>
      </Box>

      {/* AI Models Section */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <AIIcon sx={{ mr: 2, color: 'primary.main' }} />
          AI Models & Providers
        </Typography>
        
        <Grid container spacing={3}>
          {aiModels.map((model, index) => (
            <Grid item xs={12} md={6} lg={4} key={index}>
              <Card sx={{ height: '100%', border: '1px solid', borderColor: 'divider' }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom sx={{ color: 'primary.main' }}>
                    {model.name}
                  </Typography>
                  <Chip 
                    label={model.type} 
                    size="small" 
                    color="secondary" 
                    sx={{ mb: 2 }}
                  />
                  <Typography variant="body2" color="text.secondary" paragraph>
                    {model.usage}
                  </Typography>
                  
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="caption" color="text.secondary">
                      Accuracy: <strong>{model.accuracy}</strong> | 
                      Languages: <strong>{model.languages}</strong>
                    </Typography>
                  </Box>
                  
                  <Typography variant="subtitle2" gutterBottom>
                    Key Features:
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {model.features.map((feature, idx) => (
                      <Chip 
                        key={idx}
                        label={feature} 
                        size="small" 
                        variant="outlined"
                      />
                    ))}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Paper>

      {/* Technology Stack */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <ArchitectureIcon sx={{ mr: 2, color: 'primary.main' }} />
          Technology Stack
        </Typography>
        
        {techStack.map((category, index) => (
          <Accordion key={index} sx={{ mb: 2 }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                {category.icon}
                <Typography variant="h6" sx={{ ml: 2 }}>
                  {category.category}
                </Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell><strong>Technology</strong></TableCell>
                      <TableCell><strong>Version</strong></TableCell>
                      <TableCell><strong>Purpose</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {category.technologies.map((tech, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{tech.name}</TableCell>
                        <TableCell>
                          <Chip label={tech.version} size="small" variant="outlined" />
                        </TableCell>
                        <TableCell>{tech.purpose}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </AccordionDetails>
          </Accordion>
        ))}
      </Paper>

      {/* Architecture Flow */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <ProcessorIcon sx={{ mr: 2, color: 'primary.main' }} />
          System Architecture Flow
        </Typography>
        
        <Typography variant="body2" color="text.secondary" paragraph>
          The following diagram shows how voice input flows through the LISA Enhanced Voice System:
        </Typography>
        
        <Box sx={{ position: 'relative' }}>
          {architectureFlow.map((step, index) => (
            <Box key={index} sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Box
                  sx={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    bgcolor: 'primary.main',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 'bold',
                    mr: 2
                  }}
                >
                  {step.step}
                </Box>
                <Typography variant="h6" sx={{ color: 'primary.main' }}>
                  {step.component}
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ ml: 5 }}>
                {step.description}
              </Typography>
              {index < architectureFlow.length - 1 && (
                <Box
                  sx={{
                    width: 2,
                    height: 20,
                    bgcolor: 'primary.light',
                    ml: 2,
                    mt: 1
                  }}
                />
              )}
            </Box>
          ))}
        </Box>
      </Paper>

      {/* Performance Metrics */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <PerformanceIcon sx={{ mr: 2, color: 'primary.main' }} />
          Performance Metrics
        </Typography>
        
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Voice Processing Latency
              </Typography>
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Speech-to-Text: &lt;500ms
                </Typography>
                <LinearProgress variant="determinate" value={85} sx={{ mt: 1 }} />
              </Box>
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Intent Detection: &lt;300ms
                </Typography>
                <LinearProgress variant="determinate" value={90} sx={{ mt: 1 }} />
              </Box>
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Response Generation: &lt;1s
                </Typography>
                <LinearProgress variant="determinate" value={75} sx={{ mt: 1 }} />
              </Box>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Card sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Accuracy Metrics
              </Typography>
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Speech Recognition: 95%
                </Typography>
                <LinearProgress variant="determinate" value={95} color="success" sx={{ mt: 1 }} />
              </Box>
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Intent Detection: 92%
                </Typography>
                <LinearProgress variant="determinate" value={92} color="success" sx={{ mt: 1 }} />
              </Box>
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Voice Activity Detection: 88%
                </Typography>
                <LinearProgress variant="determinate" value={88} color="warning" sx={{ mt: 1 }} />
              </Box>
            </Card>
          </Grid>
        </Grid>
      </Paper>

      {/* Security & Privacy */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <SecurityIcon sx={{ mr: 2, color: 'primary.main' }} />
          Security & Privacy
        </Typography>
        
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Typography variant="h6" gutterBottom>
              Data Protection
            </Typography>
            <List dense>
              <ListItem>
                <ListItemText primary="Audio data is processed in real-time only" />
              </ListItem>
              <ListItem>
                <ListItemText primary="No permanent audio storage" />
              </ListItem>
              <ListItem>
                <ListItemText primary="Transcripts are session-based only" />
              </ListItem>
              <ListItem>
                <ListItemText primary="GDPR compliant data handling" />
              </ListItem>
            </List>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Typography variant="h6" gutterBottom>
              API Security
            </Typography>
            <List dense>
              <ListItem>
                <ListItemText primary="API keys are server-side only" />
              </ListItem>
              <ListItem>
                <ListItemText primary="CORS configured for allowed origins" />
              </ListItem>
              <ListItem>
                <ListItemText primary="Rate limiting on API endpoints" />
              </ListItem>
              <ListItem>
                <ListItemText primary="Secure WebSocket connections" />
              </ListItem>
            </List>
          </Grid>
        </Grid>
      </Paper>

      {/* Integration Points */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <IntegrationIcon sx={{ mr: 2, color: 'primary.main' }} />
          Integration Architecture
        </Typography>
        
        <Typography variant="body2" color="text.secondary" paragraph>
          LISA integrates with multiple external services and internal systems:
        </Typography>
        
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <Card sx={{ p: 2, textAlign: 'center' }}>
              <VoiceIcon sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
              <Typography variant="h6">Voice APIs</Typography>
              <Typography variant="body2" color="text.secondary">
                OpenAI, Deepgram, ElevenLabs for voice processing
              </Typography>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={4}>
            <Card sx={{ p: 2, textAlign: 'center' }}>
              <AIIcon sx={{ fontSize: 40, color: 'secondary.main', mb: 1 }} />
              <Typography variant="h6">AI Providers</Typography>
              <Typography variant="body2" color="text.secondary">
                OpenAI, Anthropic, Groq for intelligent processing
              </Typography>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={4}>
            <Card sx={{ p: 2, textAlign: 'center' }}>
              <DatabaseIcon sx={{ fontSize: 40, color: 'success.main', mb: 1 }} />
              <Typography variant="h6">Data Layer</Typography>
              <Typography variant="body2" color="text.secondary">
                PostgreSQL, Prisma ORM for data persistence
              </Typography>
            </Card>
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
};

export default TechStackPage;
