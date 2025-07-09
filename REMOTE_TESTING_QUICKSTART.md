# 🚀 **Remote Testing Quick Start**

## **TL;DR - Get Up and Running in 2 Minutes**

```bash
# 1. Run the automated setup
./setup-remote-testing.sh

# 2. Test your API
./test-api.sh

# 3. Check real-time logs
wrangler tail
```

---

## 🌍 **Why Remote Testing?**

✅ **No Local Setup Required** - Uses Cloudflare's remote services directly  
✅ **Real Production Environment** - Test exactly like your live app will run  
✅ **Multiple Environments** - Dev, Preview, Production isolation  
✅ **Cloudflare Scale** - Test with real edge computing performance  

---

## 📋 **What We've Set Up For You**

### **1. Environments Configured**
- **Development**: Your main testing environment (default)
- **Preview**: Staging environment for final testing  
- **Production**: Live environment for real users

### **2. Secure Configuration**
- ✅ JWT secrets stored in Cloudflare (not in code)
- ✅ Database points to remote Cloudflare D1
- ✅ R2 storage points to remote buckets
- ✅ Environment variables properly configured

### **3. Database Ready**
- ✅ Migrations applied to remote database
- ✅ Admin user created (username: `admin`, password: `password123`)
- ✅ All tables and schemas set up

---

## 🧪 **Quick Testing Commands**

### **Basic Health Check**
```bash
curl https://your-app.workers.dev/health
```

### **Admin Login**
```bash
curl -X POST https://your-app.workers.dev/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "password123"}'
```

### **Create a Design (Admin)**
```bash
# First get admin token from login response, then:
curl -X POST https://your-app.workers.dev/api/designs \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "title": "Test Saree",
    "description": "Beautiful test saree",
    "r2_object_key": "test/saree.jpg",
    "category": "sarees"
  }'
```

### **List Designs (Public)**
```bash
curl https://your-app.workers.dev/api/designs
```

---

## 🛠️ **Different Environment Testing**

### **Deploy to Environments**
```bash
wrangler deploy                    # Development (default)
wrangler deploy --env preview     # Preview/Staging
wrangler deploy --env production  # Production
```

### **Environment-Specific Commands**
```bash
# Secrets
wrangler secret list --env production
wrangler secret put JWT_SECRET --env production

# Database
wrangler d1 execute design-gallery-db-prod --env production --remote --command "SELECT COUNT(*) FROM users;"

# Logs
wrangler tail --env production
```

---

## 📊 **Monitoring Your API**

### **Real-time Logs**
```bash
wrangler tail                    # Development logs
wrangler tail --env production   # Production logs
```

### **Deployment Status**
```bash
wrangler deployments list                    # Development
wrangler deployments list --env production   # Production
```

### **Database Status**
```bash
wrangler d1 execute design-gallery-db --remote --command "SELECT COUNT(*) FROM users;"
```

---

## 🔑 **Default Credentials**

### **Admin User**
- **Username**: `admin`
- **Password**: `password123`
- **Permissions**: Full admin access

### **JWT Token**
- **Algorithm**: HS256
- **Expiration**: 24 hours
- **Storage**: Cloudflare secrets (secure)

---

## 📚 **Complete Documentation**

- **[API Testing Guide](docs/API_TESTING_GUIDE.md)** - Comprehensive testing documentation
- **[API Documentation](docs/API_DOCUMENTATION.md)** - Complete API reference
- **[Code Flow Guide](docs/CODE_FLOW_GUIDE.md)** - Architecture overview

---

## 🎯 **Testing Checklist**

### **Basic Functionality** ✅
- [ ] Health endpoint returns 200
- [ ] Admin login works and returns JWT
- [ ] User registration works
- [ ] Designs can be created/read/updated/deleted
- [ ] Image upload to R2 works
- [ ] User approval system works

### **Security** 🔒
- [ ] Unauthenticated requests blocked
- [ ] Admin-only endpoints protected
- [ ] JWT validation working
- [ ] Input validation active

### **Performance** ⚡
- [ ] Response times < 500ms
- [ ] Database queries optimized
- [ ] File uploads complete
- [ ] Concurrent requests handled

---

## 🆘 **Troubleshooting**

### **Common Issues**

**"Deployment failed"**
```bash
# Check for missing dependencies
npm install
npm audit fix
```

**"Database connection failed"**
```bash
# Apply migrations
wrangler d1 migrations apply design-gallery-db --remote
```

**"Authentication error"**
```bash
# Check JWT secret is set
wrangler secret list
```

**"CORS errors"**
```bash
# Update CORS_ORIGINS in wrangler.toml
CORS_ORIGINS = "*"  # For development
```

### **Get Help**
- Check logs: `wrangler tail`
- Test health: `curl YOUR_URL/health`
- Verify database: `wrangler d1 execute design-gallery-db --remote --command "SELECT name FROM sqlite_master WHERE type='table';"`

---

## 🚀 **Next Steps**

1. **Test all endpoints** using the comprehensive API guide
2. **Deploy to preview** for staging tests
3. **Configure production** with custom domain
4. **Set up monitoring** and error tracking
5. **Document your APIs** for frontend integration

---

**🎉 You're now testing with real Cloudflare infrastructure!**

Your API is deployed, secure, and ready for comprehensive testing across all environments. 