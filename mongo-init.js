db = db.getSiblingDB('blood_alert_mvp');

// Create user for the application
db.createUser({
  user: 'blooduser',
  pwd: 'bloodpass123',
  roles: [
    { role: 'readWrite', db: 'blood_alert_mvp' }
  ]
});

// Create collections with proper indexes
db.createCollection('users');
db.createCollection('bloodrequests');
db.createCollection('pledges');
db.createCollection('swaprequests');

print('Blood Alert MVP database initialized successfully!');
