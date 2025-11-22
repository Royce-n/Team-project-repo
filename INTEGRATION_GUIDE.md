# Integration Guide - Team Aurora & Arlington Team

This document explains the two-way integration between our petition systems.

## Overview

Both teams have created public APIs that allow each system to fetch and display forms from the other team's system.

---

## 🔵 For the Other Team to Access OUR Forms

### GET Request
```
GET https://aurora.jguliz.com/approvals/get-forms
```

### Response Format
```json
[
  {
    "form_code": "petition_type_1",
    "link": "https://aurora.jguliz.com/petitions/new?type=1",
    "name": "Change of Major",
    "description": "Request to change your major/program"
  },
  {
    "form_code": "petition_type_2",
    "link": "https://aurora.jguliz.com/petitions/new?type=2",
    "name": "Course Substitution",
    "description": "Request to substitute a required course"
  }
  // ... more petition types
]
```

### Implementation Details

- **Endpoint**: `/approvals/get-forms`
- **Authentication**: ❌ None required (public endpoint)
- **Method**: GET
- **Response Type**: JSON array
- **CORS**: Enabled for cross-origin requests

### Form Fields

| Field | Type | Description |
|-------|------|-------------|
| `form_code` | string | Unique identifier (format: `petition_type_{id}`) |
| `link` | string | Direct URL to the petition form |
| `name` | string | Display name of the petition type |
| `description` | string | Brief description of what the petition is for |

### Example Usage (JavaScript)

```javascript
// Fetch Aurora team's forms
const response = await fetch('https://aurora.jguliz.com/approvals/get-forms');
const forms = await response.json();

console.log(forms);
// Display the forms in your UI
forms.forEach(form => {
  console.log(`${form.name}: ${form.link}`);
});
```

### Direct Form Access

You can also link directly to a specific petition type:

```
GET https://aurora.jguliz.com/approvals/forms/{form_code}
```

This will redirect the user to the petition form with the type pre-selected.

**Example:**
```
https://aurora.jguliz.com/approvals/forms/petition_type_1
```
Redirects to → `https://aurora.jguliz.com/petitions/new?type=1`

---

## 🟢 How WE Access Arlington Team's Forms

### GET Request
```
GET https://arlington.rindeer.com/approvals/get-forms
```

### Response Format (from Arlington Team)
```json
[
  {
    "form_code": "ferpa_auth",
    "link": "https://arlington.rindeer.com/approvals/forms/ferpa_auth",
    "name": "FERPA Authorization Form"
  },
  {
    "form_code": "general_petition",
    "link": "https://arlington.rindeer.com/approvals/forms/general_petition",
    "name": "General Petition Form"
  }
]
```

### Implementation on Our Side

We've created:
1. **Backend proxy endpoint**: `/api/external-forms` (requires authentication)
2. **Frontend page**: `/external-forms` - Displays Arlington team's forms
3. **Navigation item**: "External Forms" in sidebar

When our users click on an external form, it opens the Arlington team's form in a new tab.

---

## 🔧 Technical Implementation

### Backend Route (publicForms.js)

Located at: `backend/routes/publicForms.js`

```javascript
// GET /approvals/get-forms
router.get('/get-forms', async (req, res) => {
  // Fetches all active petition types from database
  // Returns them in the standardized format
});

// GET /approvals/forms/:formCode
router.get('/forms/:formCode', (req, res) => {
  // Redirects to the petition form
});
```

### Server Configuration (server.js)

```javascript
// Public API routes (no authentication required)
app.use('/approvals', publicFormsRoutes);
```

**Important**: This route is mounted BEFORE the authentication middleware, making it publicly accessible.

---

## 🧪 Testing the Integration

### Test Our Public Endpoint

```bash
# Using curl
curl https://aurora.jguliz.com/approvals/get-forms

# Using JavaScript/Browser Console
fetch('https://aurora.jguliz.com/approvals/get-forms')
  .then(res => res.json())
  .then(data => console.log(data));
```

### Test Arlington Team's Endpoint

```bash
# Using curl
curl https://arlington.rindeer.com/approvals/get-forms

# Already verified working ✅
```

---

## 🔒 Security Considerations

### Our Public Endpoint
- ✅ Read-only access (GET only)
- ✅ No sensitive data exposed (only petition type names and links)
- ✅ CORS enabled for cross-origin requests
- ✅ Rate limiting applied (inherited from server config)
- ✅ No authentication required (by design for integration)

### Their Forms
- ✅ External links open in new tab with `noopener,noreferrer`
- ✅ Our backend proxies requests (doesn't expose API key)
- ✅ Users stay authenticated in our system

---

## 📊 Database Schema

The public endpoint fetches from the `petition_types` table:

```sql
SELECT
  petition_type_id,
  type_name,
  description,
  is_active
FROM petition_types
WHERE is_active = true
ORDER BY type_name ASC
```

---

## 🚀 Deployment Checklist

- [x] Backend route created (`publicForms.js`)
- [x] Route mounted in `server.js`
- [x] Frontend page created (`ExternalForms.js`)
- [x] Navigation updated
- [x] Axios installed
- [ ] Deploy to production server
- [ ] Test on aurora.jguliz.com
- [ ] Notify Arlington team of our endpoint
- [ ] Update CORS settings if needed

---

## 📞 Contact Information

**Team Aurora**
- Domain: `aurora.jguliz.com`
- Public API: `https://aurora.jguliz.com/approvals/get-forms`

**Arlington Team**
- Domain: `arlington.rindeer.com`
- Public API: `https://arlington.rindeer.com/approvals/get-forms`

---

## 🐛 Troubleshooting

### Issue: CORS Error
**Solution**: Ensure CORS is enabled in `server.js`:
```javascript
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? ['https://aurora.jguliz.com', 'https://arlington.rindeer.com']
    : ['http://localhost:3000'],
  credentials: true
}));
```

### Issue: 404 Not Found
**Solution**: Verify the route is mounted BEFORE the 404 handler in `server.js`

### Issue: Database Connection Error
**Solution**: Check that the database pool is properly initialized in the route

---

## 📝 Notes for Arlington Team

To integrate with our system, you need to:

1. **Make a GET request** to: `https://aurora.jguliz.com/approvals/get-forms`
2. **Parse the JSON response** to get our petition types
3. **Display the forms** in your UI
4. **Redirect users** to the `link` field when they select a form

**No authentication required!** Our endpoint is public for integration purposes.

---

Last Updated: 2025-11-22
