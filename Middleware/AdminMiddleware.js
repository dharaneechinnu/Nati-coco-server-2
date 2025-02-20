const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    
    // Check if Authorization header exists
    if (!authHeader) {
      return res.status(401).json({ message: 'Access denied. No token provided.' });
    }

    // Extract token from the Bearer format
    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: 'Access denied. Token is missing.' });
    }

    // Verify token using the secret key
    jwt.verify(token, process.env.ADMIN_TOKEN, (err, decoded) => {
      if (err) {
        // Differentiate between expired and invalid tokens
        if (err.name === 'TokenExpiredError') {
          return res.status(401).json({ message: 'Token expired. Please login again.' });
        }
        return res.status(401).json({ message: 'Invalid token. Authentication failed.' });
      }

      // Attach the decoded token payload to the request for further use
      req.user = decoded;

      next(); // Proceed to the next middleware or route handler
    });
  } catch (error) {
    console.error('Error verifying token:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = verifyToken;