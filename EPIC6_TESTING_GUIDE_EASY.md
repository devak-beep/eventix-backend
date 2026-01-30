# 🎯 EPIC 6 Testing Guide - Easy to Understand & Implement

This guide walks you through testing all 3 background jobs in EPIC 6. No prior knowledge needed!

---

## 📋 What is EPIC 6?

EPIC 6 implements **3 automatic background jobs** that run every minute to keep the system clean:

1. **Lock Expiry Job** - Cleans up expired seat locks and releases seats
2. **Booking Expiry Job** - Cleans up unpaid bookings and releases seats
3. **Recovery Job** - Fixes broken state when server crashes

---

## 🚀 Before You Start

### Prerequisites

- ✅ Node.js installed
- ✅ MongoDB running (with replica set)
- ✅ Terminal/Command Prompt open
- ✅ Server running (`npm run dev`)

### Test Data Setup

We'll create a user and event for testing. Run these commands:

```bash
# Register a user
curl -X POST "http://localhost:3000/api/users/register" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "password": "123456"
  }'

# Copy the user ID from response (you'll need it)
# Let's call it: USER_ID
```

```bash
# Create an event with 100 seats
curl -X POST "http://localhost:3000/api/events" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Event",
    "description": "For EPIC 6 testing",
    "eventDate": "2026-06-15T10:00:00Z",
    "totalSeats": 100
  }'

# Copy the event ID from response
# Let's call it: EVENT_ID
```

Save these IDs - you'll use them in all tests!

---

## ✅ TEST 1: Lock Expiry Job (Task 6.1)

### What Does This Test?

Tests if the system automatically expires old seat locks and releases seats back.

### How It Works

1. Create a lock (reserves 5 seats)
2. Seats reduce from 100 → 95
3. Wait for lock to expire (5 minutes)
4. Background job detects expired lock
5. Seats automatically restore 95 → 100

### Step-by-Step Instructions

#### STEP 1: Create a Seat Lock

```bash
curl -X POST "http://localhost:3000/api/locks" \
  -H "Content-Type: application/json" \
  -d '{
    "eventId": "EVENT_ID",
    "userId": "USER_ID",
    "seats": 5,
    "idempotencyKey": "test-lock-1"
  }'
```

**Expected Response:**

```json
{
  "success": true,
  "data": {
    "_id": "LOCK_ID",
    "eventId": "EVENT_ID",
    "userId": "USER_ID",
    "seats": 5,
    "status": "ACTIVE",
    "expiresAt": "2026-01-29T11:35:00Z",
    "createdAt": "2026-01-29T11:30:00Z"
  }
}
```

**Save:** Note the `LOCK_ID` and `expiresAt` time.

---

#### STEP 2: Verify Seats Were Reduced

```bash
curl -X GET "http://localhost:3000/api/events/EVENT_ID" \
  -H "Content-Type: application/json"
```

**Expected Response:**

```json
{
  "success": true,
  "data": {
    "name": "Test Event",
    "totalSeats": 100,
    "availableSeats": 95  ← Should be 95 (100 - 5)
  }
}
```

✅ **Verification:** availableSeats = 95

---

#### STEP 3: Make Lock Expire in Database

The lock expires after 5 minutes. To speed up testing, manually set expiration to the past:

```bash
mongosh "mongodb://127.0.0.1:27017/event_booking?replicaSet=rs0" --eval "
db.seatlocks.updateOne(
  {_id: ObjectId('LOCK_ID')},
  {\$set: {expiresAt: new Date('2026-01-29T11:00:00Z')}}
)
"
```

**Replace:** `LOCK_ID` with your actual lock ID

**Expected Output:**

```
{ acknowledged: true, modifiedCount: 1, ... }
```

✅ **Verification:** modifiedCount = 1 (lock was updated)

---

#### STEP 4: Watch Job Run and Clean Up

The lock expiry job runs **every 1 minute**. Watch your server console:

```
[LOCK EXPIRY JOB] Found 1 expired locks
[LOCK EXPIRY JOB] Expired lock 697b3eb13a8ba6d8547a4bc0, restored 5 seats to event 697b3dcf3a8ba6d8547a4bb4
[LOCK EXPIRY JOB] Successfully expired 1 locks
```

🎯 **What Happened:**

- Job found 1 expired lock
- Job marked lock as EXPIRED
- Job restored 5 seats to the event

⏰ **Wait:** If you don't see logs after 2 minutes, the job might be running at an odd interval. Wait up to 1 more minute.

---

#### STEP 5: Verify Seats Were Restored

```bash
curl -X GET "http://localhost:3000/api/events/EVENT_ID" \
  -H "Content-Type: application/json"
```

**Expected Response:**

```json
{
  "success": true,
  "data": {
    "name": "Test Event",
    "totalSeats": 100,
    "availableSeats": 100  ← Should be 100 again!
  }
}
```

✅ **Verification:** availableSeats = 100 (seats fully restored!)

---

### ✅ TEST 1 Complete!

**Summary:**

- ✅ Created lock → 5 seats reserved
- ✅ Verified availableSeats reduced to 95
- ✅ Made lock expire in past
- ✅ Job ran and cleaned up lock
- ✅ Verified availableSeats restored to 100

---

## ✅ TEST 2: Booking Expiry Job (Task 6.2)

### What Does This Test?

Tests if the system automatically expires unpaid bookings and releases seats.

### How It Works

1. Create a lock (reserves 3 seats)
2. Create a booking with PAYMENT_PENDING status
3. Seats reduce from 100 → 97
4. Wait for booking payment deadline to pass
5. Background job detects expired booking
6. Seats automatically restore 97 → 100

### Step-by-Step Instructions

#### STEP 1: Create Another Seat Lock

```bash
curl -X POST "http://localhost:3000/api/locks" \
  -H "Content-Type: application/json" \
  -d '{
    "eventId": "EVENT_ID",
    "userId": "USER_ID",
    "seats": 3,
    "idempotencyKey": "test-lock-2"
  }'
```

**Save:** The `LOCK_ID_2` from response

---

#### STEP 2: Verify Seats Reduced

```bash
curl -X GET "http://localhost:3000/api/events/EVENT_ID"
```

**Expected:** availableSeats = 97

---

#### STEP 3: Confirm Booking (Convert Lock to Booking)

```bash
curl -X POST "http://localhost:3000/api/bookings/confirm" \
  -H "Content-Type: application/json" \
  -d '{
    "lockId": "LOCK_ID_2"
  }'
```

**Expected Response:**

```json
{
  "success": true,
  "booking": {
    "_id": "BOOKING_ID",
    "event": "EVENT_ID",
    "user": "USER_ID",
    "seats": [3],
    "status": "PAYMENT_PENDING",
    "paymentExpiresAt": "2026-01-29T11:45:00Z"
  }
}
```

**Save:** The `BOOKING_ID` from response

---

#### STEP 4: Make Booking Payment Expire

The booking payment deadline is 10 minutes. To speed up testing, set it to the past:

```bash
mongosh "mongodb://127.0.0.1:27017/event_booking?replicaSet=rs0" --eval "
db.bookings.updateOne(
  {_id: ObjectId('BOOKING_ID')},
  {\$set: {paymentExpiresAt: new Date('2026-01-29T11:00:00Z')}}
)
"
```

**Replace:** `BOOKING_ID` with your actual booking ID

---

#### STEP 5: Watch Job Run and Clean Up

Watch your server console for booking expiry logs:

```
[BOOKING EXPIRY JOB] Found 1 expired bookings
[BOOKING EXPIRY JOB] Expired booking 697b421e3a8ba6d8547a4bea
[BOOKING EXPIRY JOB] Successfully expired 1 bookings
```

🎯 **What Happened:**

- Job found 1 expired booking
- Job marked booking as EXPIRED
- Job released the lock
- Job restored 3 seats to the event

---

#### STEP 6: Verify Seats Were Restored

```bash
curl -X GET "http://localhost:3000/api/events/EVENT_ID"
```

**Expected:** availableSeats = 100 (restored!)

---

#### STEP 7: Verify Booking Status Changed

```bash
mongosh "mongodb://127.0.0.1:27017/event_booking?replicaSet=rs0" --eval "
db.bookings.findOne({_id: ObjectId('BOOKING_ID')})
"
```

**Expected:** status: "EXPIRED"

---

### ✅ TEST 2 Complete!

**Summary:**

- ✅ Created lock with 3 seats
- ✅ Created booking (status = PAYMENT_PENDING)
- ✅ Verified availableSeats reduced to 97
- ✅ Made booking payment expire
- ✅ Job ran and cleaned up booking
- ✅ Verified availableSeats restored to 100
- ✅ Verified booking status changed to EXPIRED

---

## ✅ TEST 3: Recovery Job (Task 6.3)

### What Does This Test?

Tests if the system recovers from broken state when server crashes.

### How It Works

1. Create stale locks/bookings in database (simulate crash)
2. Restart server
3. Recovery job runs on startup
4. Job detects stale data and fixes it
5. Seats are restored

### Step-by-Step Instructions

#### STEP 1: Create a Stale Lock (Manually in Database)

```bash
mongosh "mongodb://127.0.0.1:27017/event_booking?replicaSet=rs0" --eval "
db.seatlocks.insertOne({
  eventId: ObjectId('EVENT_ID'),
  userId: ObjectId('USER_ID'),
  seats: 7,
  status: 'ACTIVE',
  expiresAt: new Date('2026-01-29T10:00:00Z'),  // Old time (expired)
  idempotencyKey: 'stale-lock-test',
  createdAt: new Date('2026-01-29T09:00:00Z'),
  updatedAt: new Date('2026-01-29T09:00:00Z')
})
"
```

**Note:** This creates a lock that expired before the server started.

---

#### STEP 2: Manually Reduce Event Seats

The lock reduced 7 seats but job never cleaned it up (simulating crash):

```bash
mongosh "mongodb://127.0.0.1:27017/event_booking?replicaSet=rs0" --eval "
db.events.updateOne(
  {_id: ObjectId('EVENT_ID')},
  {\$inc: {availableSeats: -7}}
)
"
```

**Now:**

- availableSeats = 93 (100 - 7)
- Stale lock exists in database
- No booking exists

---

#### STEP 3: Verify Problem State

```bash
curl -X GET "http://localhost:3000/api/events/EVENT_ID"
```

**Expected:** availableSeats = 93

```bash
mongosh "mongodb://127.0.0.1:27017/event_booking?replicaSet=rs0" --eval "
db.seatlocks.countDocuments({status: 'ACTIVE'})
"
```

**Expected:** 1 (one stale active lock exists)

---

#### STEP 4: Restart Server

Stop and restart the server:

```bash
# In terminal 1 (where server is running): Press Ctrl+C to stop

# Wait 2 seconds, then restart:
npm run dev
```

---

#### STEP 5: Watch Recovery Job Run

When server starts, watch for recovery logs:

```
[RECOVERY] Starting system recovery...
[RECOVERY] Released 7 seats from stale lock 697b3eb13a8ba6d8547a4bc0
[RECOVERY] ✅ System recovery completed successfully
```

🎯 **What Happened:**

- Recovery job found 1 stale lock
- Job marked lock as EXPIRED
- Job restored 7 seats

---

#### STEP 6: Verify Seats Restored

```bash
curl -X GET "http://localhost:3000/api/events/EVENT_ID"
```

**Expected:** availableSeats = 100 (fully restored!)

---

#### STEP 7: Verify Lock is Expired

```bash
mongosh "mongodb://127.0.0.1:27017/event_booking?replicaSet=rs0" --eval "
db.seatlocks.findOne({idempotencyKey: 'stale-lock-test'})
"
```

**Expected:** status: "EXPIRED"

---

### ✅ TEST 3 Complete!

**Summary:**

- ✅ Created stale lock in database
- ✅ Reduced event seats (simulated crash)
- ✅ Verified seats were reduced
- ✅ Restarted server
- ✅ Recovery job ran and detected stale lock
- ✅ Recovery job restored 7 seats
- ✅ Verified seats are back to 100
- ✅ Verified lock status is EXPIRED

---

## 🎓 What You Learned

### Lock Expiry Job

- Runs every 1 minute automatically
- Finds locks where `expiresAt < current time`
- Marks them EXPIRED and releases seats
- **Purpose:** Prevent seat starvation if user doesn't complete payment

### Booking Expiry Job

- Runs every 1 minute automatically
- Finds bookings where `paymentExpiresAt < current time`
- Marks them EXPIRED and releases their lock's seats
- **Purpose:** Prevent seat starvation if payment is never completed

### Recovery Job

- Runs ONCE when server starts
- Finds stale locks and bookings
- Releases their seats back to events
- **Purpose:** Fix broken state from server crashes

---

## 📊 Summary Table

| Test           | What                   | Triggers       | Result           |
| -------------- | ---------------------- | -------------- | ---------------- |
| Lock Expiry    | Old locks expire       | Every 1 minute | Seats released   |
| Booking Expiry | Unpaid bookings expire | Every 1 minute | Seats released   |
| Recovery       | Stale data fixed       | Server startup | System corrected |

---

## 🐛 Troubleshooting

### Problem: Jobs not running

**Solution:** Check server logs. If you see `[JOBS]` messages, jobs are scheduled.

### Problem: Seats not restoring

**Solution:**

- Make sure lock/booking is actually expired (check expiresAt/paymentExpiresAt)
- Wait another minute for job to run
- Check server is still running

### Problem: Can't connect to MongoDB

**Solution:**

- Make sure MongoDB is running
- Check .env has correct MONGO_URI
- Verify replica set is initialized

### Problem: Commands not working

**Solution:**

- Replace EVENT_ID, USER_ID, LOCK_ID with your actual IDs
- Make sure server is running on port 3000
- Check JSON syntax is correct

---

## ✅ Checklist - Confirm All Tests Passed

- [ ] TEST 1: Lock Expiry Job - seats restored from 95 → 100
- [ ] TEST 2: Booking Expiry Job - seats restored from 97 → 100
- [ ] TEST 3: Recovery Job - seats restored from 93 → 100

**If all 3 are checked, EPIC 6 is working correctly!** 🎉

---

## 📝 Next Steps

1. **Commit your changes:**

```bash
git add .
git commit -m "EPIC 6: Background jobs for lock and booking expiry"
git push origin main
```

2. **Share results:**
   - Take screenshots of job logs
   - Document any issues found
   - Share with team

3. **Deploy to production:**
   - Same code works on production
   - Jobs run automatically
   - System self-heals from crashes

---

## 💡 Key Takeaways

✅ **Locks prevent overbooking** - Reserve seats while user pays  
✅ **Jobs clean up automatically** - Every minute, system gets cleaned  
✅ **Recovery fixes crashes** - Broken state is auto-repaired on startup  
✅ **No manual intervention needed** - System heals itself!

---

**Happy Testing! 🚀**

If you have questions, refer to the commented code in `/src` folder.
