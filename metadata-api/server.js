const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { generateCertificateSVG } = require('./generate-certificate-svg');

const app = express();
const PORT = process.env.PORT || 3002;

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, 'public/images/plans');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // planId will be available in req.query or use timestamp
    const planId = req.query.planId || Date.now();
    const ext = path.extname(file.originalname);
    cb(null, `plan-${planId}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files allowed'));
    }
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files
app.use('/images', express.static(path.join(__dirname, 'public/images')));

// Get single plan metadata (from JSON file)
app.get('/api/plans/:planId', (req, res) => {
  const planId = parseInt(req.params.planId);
  const filePath = path.join(__dirname, 'public', 'plans', `plan-${planId}.json`);
  
  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf8');
      const metadata = JSON.parse(data);
      res.json(metadata);
    } else {
      // Return default metadata if file doesn't exist
      res.json(getDefaultPlanMetadata(planId));
    }
  } catch (error) {
    console.error(`Error reading plan-${planId}.json:`, error);
    res.json(getDefaultPlanMetadata(planId));
  }
});

// Get all plans metadata
app.get('/api/plans', (req, res) => {
  const plansDir = path.join(__dirname, 'public', 'plans');
  const plans = [];
  
  try {
    if (fs.existsSync(plansDir)) {
      const files = fs.readdirSync(plansDir);
      
      files.forEach(file => {
        if (file.startsWith('plan-') && file.endsWith('.json')) {
          const data = fs.readFileSync(path.join(plansDir, file), 'utf8');
          plans.push(JSON.parse(data));
        }
      });
    }
    
    // Sort by id
    plans.sort((a, b) => a.id - b.id);
    res.json(plans);
  } catch (error) {
    console.error('Error reading plans:', error);
    res.json([]);
  }
});

// Image upload endpoint
app.post('/api/upload-image', upload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No image uploaded' });
    }
    
    const imagePath = `/images/plans/${req.file.filename}`;
    res.json({ success: true, imagePath });
  } catch (error) {
    console.error('Image upload error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create/Update plan metadata (for admin)
app.post('/api/plans/:planId', (req, res) => {
  const planId = parseInt(req.params.planId);
  const metadata = req.body;
  const filePath = path.join(__dirname, 'public', 'plans', `plan-${planId}.json`);
  
  try {
    // Ensure plans directory exists
    const plansDir = path.join(__dirname, 'public', 'plans');
    if (!fs.existsSync(plansDir)) {
      fs.mkdirSync(plansDir, { recursive: true });
    }
    
    // Add id if not present
    metadata.id = planId;
    
    // Write to file
    fs.writeFileSync(filePath, JSON.stringify(metadata, null, 2));
    
    res.json({ success: true, message: 'Metadata saved' });
  } catch (error) {
    console.error(`Error saving plan-${planId}.json:`, error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get deposit metadata (NFT metadata endpoint)
app.get('/metadata/:tokenId', async (req, res) => {
  const tokenId = req.params.tokenId;
  
  // Generate inline base64 SVG (works on Etherscan!)
  const imageDataURI = generateCertificateSVG(tokenId);
  
  const metadata = {
    name: `Term Deposit Certificate #${tokenId}`,
    description: `Certificate of ownership for a term deposit in the decentralized savings protocol. This NFT represents your deposit and can be used as proof of ownership.`,
    image: imageDataURI, // Base64 encoded SVG
    external_url: `https://term-deposit-dapp.vercel.app/nft-gallery`,
    attributes: [
      { trait_type: "Certificate ID", value: tokenId },
      { trait_type: "Type", value: "Savings Certificate" },
      { trait_type: "Status", value: "Active" },
      { trait_type: "Standard", value: "ERC-721" }
    ]
  };
  
  res.json(metadata);
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Helper function for default metadata
function getDefaultPlanMetadata(planId) {
  const templates = [
    {
      icon: "💰",
      name: "Flexible Saver",
      description: "Short-term, high-liquidity savings plan",
      features: ["Low minimum deposit", "Quick maturity", "Flexible terms"],
      riskLevel: "Low",
      recommended: ["beginners", "short-term savers"],
      color: "#10B981"
    },
    {
      icon: "📈",
      name: "Growth Builder",
      description: "Medium-term balanced returns",
      features: ["Competitive APR", "Moderate duration", "Balanced risk"],
      riskLevel: "Medium",
      recommended: ["moderate investors", "goal-oriented"],
      color: "#3B82F6"
    },
    {
      icon: "💎",
      name: "Wealth Maximizer",
      description: "Long-term maximum returns",
      features: ["Highest APR", "Long commitment", "Maximum growth"],
      riskLevel: "Low",
      recommended: ["long-term investors", "wealth builders"],
      color: "#8B5CF6"
    }
  ];
  
  const template = templates[(planId - 1) % 3];
  return {
    id: planId,
    ...template
  };
}

app.listen(PORT, () => {
  console.log(`🚀 Metadata API running on http://localhost:${PORT}`);
  console.log(`   - Plans: http://localhost:${PORT}/api/plans`);
  console.log(`   - Health: http://localhost:${PORT}/health`);
}).on('error', (err) => {
  console.error('❌ Server error:', err);
  process.exit(1);
});
