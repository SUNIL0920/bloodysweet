# 🐳 Docker Deployment Guide for Blood Alert App

This guide will help you deploy the Blood Alert application using Docker and Docker Compose.

## 📋 Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running
- [Docker Compose](https://docs.docker.com/compose/) (usually comes with Docker Desktop)
- At least 4GB of available RAM
- Ports 3000, 5000, 27017, and 6379 available

## 🚀 Quick Start

### **Option 1: Using the Deployment Script (Recommended)**

#### **Windows:**
```bash
# Double-click deploy.bat or run in Command Prompt:
deploy.bat
```

#### **Linux/Mac:**
```bash
# Make the script executable and run:
chmod +x deploy.sh
./deploy.sh
```

### **Option 2: Manual Deployment**

```bash
# 1. Build and start all services
docker-compose up --build -d

# 2. Check service status
docker-compose ps

# 3. View logs
docker-compose logs -f
```

## 🌐 Access Points

After successful deployment, your services will be available at:

- **Frontend (React App)**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **MongoDB**: localhost:27017
- **Redis**: localhost:6379

## 📊 Service Management

### **View Running Services:**
```bash
docker-compose ps
```

### **View Logs:**
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f mongodb
```

### **Stop Services:**
```bash
docker-compose down
```

### **Restart Services:**
```bash
docker-compose restart
```

### **Rebuild and Restart:**
```bash
docker-compose up --build -d
```

## 🔧 Configuration

### **Environment Variables**

The application uses these environment variables (configured in docker-compose.yml):

- `MONGO_URI`: MongoDB connection string
- `CORS_ORIGIN`: Allowed frontend origin
- `JWT_SECRET`: Secret key for JWT tokens
- `PORT`: Backend server port
- `FROM_EMAIL`: Default sender email

### **Customizing Configuration**

1. **Edit docker-compose.yml** to modify:
   - Port mappings
   - Environment variables
   - Volume mounts
   - Network settings

2. **Create .env file** for sensitive data:
   ```bash
   # Create .env file in project root
   MONGO_PASSWORD=your_secure_password
   JWT_SECRET=your_super_secret_key
   ```

## 🗄️ Database

### **MongoDB Data Persistence**

- Data is stored in a Docker volume: `mongodb_data`
- Database automatically initializes with required collections
- Default credentials: `admin/password123`
- Application user: `blooduser/bloodpass123`

### **Accessing MongoDB:**

```bash
# Connect to MongoDB container
docker exec -it blood-alert-mongodb mongosh -u admin -p password123

# Use the database
use blood_alert_mvp

# Show collections
show collections
```

## 🔍 Troubleshooting

### **Common Issues:**

1. **Port Already in Use:**
   ```bash
   # Check what's using the port
   netstat -ano | findstr :3000
   
   # Kill the process or change ports in docker-compose.yml
   ```

2. **MongoDB Connection Failed:**
   ```bash
   # Check MongoDB logs
   docker-compose logs mongodb
   
   # Restart MongoDB service
   docker-compose restart mongodb
   ```

3. **Frontend Not Loading:**
   ```bash
   # Check frontend logs
   docker-compose logs frontend
   
   # Verify backend is running
   docker-compose ps backend
   ```

4. **Build Failures:**
   ```bash
   # Clean up and rebuild
   docker-compose down
   docker system prune -f
   docker-compose up --build -d
   ```

### **Log Analysis:**

```bash
# Real-time logs for debugging
docker-compose logs -f --tail=100

# Specific error patterns
docker-compose logs | grep -i error
docker-compose logs | grep -i fail
```

## 📈 Production Considerations

### **Security:**
- Change default passwords in docker-compose.yml
- Use strong JWT_SECRET
- Enable HTTPS in production
- Restrict network access

### **Performance:**
- Add Redis for caching
- Use MongoDB Atlas for production database
- Enable gzip compression
- Set up monitoring and logging

### **Scaling:**
- Use Docker Swarm or Kubernetes
- Implement load balancing
- Set up auto-scaling policies
- Monitor resource usage

## 🧹 Cleanup

### **Remove All Data:**
```bash
# Stop and remove containers, networks, and volumes
docker-compose down -v

# Remove all unused Docker resources
docker system prune -a -f
```

### **Remove Specific Volumes:**
```bash
# List volumes
docker volume ls

# Remove specific volume
docker volume rm blood-alert_mongodb_data
```

## 📚 Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [MongoDB Docker Guide](https://hub.docker.com/_/mongo)
- [Nginx Docker Guide](https://hub.docker.com/_/nginx)

## 🆘 Support

If you encounter issues:

1. Check the logs: `docker-compose logs -f`
2. Verify Docker is running: `docker info`
3. Check port availability
4. Review this troubleshooting guide
5. Check GitHub issues for known problems

---

**Happy Deploying! 🎉**
