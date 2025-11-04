# Backend Test Suite

This contains the complete automated test suite for the backend. The primary goal of this suite is to ensure the reliability, security, and correctness of the API's logic.

We use a multi-layered testing strategy that covers different parts of the application in isolation and in integration.

---

## Core Technologies

- **Test Runner:** Jest
- **HTTP Testing:** Supertest
- **In-Memory Database:** mongodb-memory-server
- **Assertions:** Jest's built-in expect API
- **Mocking:** Jest's global jest object (e.g., `jest.spyOn`)

---

## How to Run Tests

From the project's root directory, run the single test script:

```bash
# This command runs Jest in a band (sequentially) and detects open handles.
npm test
```

The test script will automatically find all files ending in `.test.ts` within the `src/` directory.

---

## Directory Structure & Test Types

The `/tests` directory is organized by the type of test being performed.

### **src/tests/DB_test/** (Database Integration Tests)

- **Purpose:** To verify the database connection logic in `src/config/db.ts` under different conditions.
- **MongoConn.test.ts:**  
  An integration test that starts a real, in-memory MongoDB server (`mongodb-memory-server`) and confirms that the `connectDB` and `disconnectDB` functions work correctly.  
  It also includes `beforeEach` hooks to clear all collections, ensuring each test is isolated.
- **Mongosanity.test.ts:**  
  A simple "sanity check" test that connects to a local test database. This test is primarily used to confirm that the local development environment is configured correctly.

### **src/tests/unit/** (Unit Tests)

- **Purpose:** To test the internal logic of a single module (a "unit") in complete isolation.
- **User.test.ts:**  
  This file tests the custom business logic defined within the User model.  
  - It verifies that the `pre('save')` hook correctly hashes a password for a local user.  
  - It verifies that the `pre('save')` hook does not hash a password for a Google user.  
  - It verifies that the `comparePassword` method correctly returns `true` for a valid password and `false` for an invalid one.

### **src/tests/auth_test/** (API End-to-End Tests)

- **Purpose:** To test the full request/response lifecycle of the authentication API. These tests simulate a real client making HTTP requests to the application.
- **auth.test.ts:**  
  - Uses Supertest to send HTTP requests (e.g., `request(app).post('/api/auth/register')`).  
  - Tests the "happy path" (e.g., successful registration returns a 201 status).  
  - Tests validation logic (e.g., registering with an existing email correctly returns a 400 status and the specific error message).  
  - **Mocking:** This suite also mocks the logger to confirm that the `errorHandler` is correctly logging errors when a route fails, without polluting the test output.