# Test Plan - Web App

## 1. Goal
Check that login, user management, roles, and deactivation all work.

## 2. What to Test
- Login with Office365  
- Add, edit, and delete users  
- Assign roles  
- Deactivate and reactivate users  
- Basic page navigation

## 3. Test Setup
- Use Azure App Service with Azure AD  
- Test in Chrome / other browsers  
- Roles: Admin, Manager, BasicUser 

## 4. Test Cases
| # | Test | Expected Result |
|---|------|-----------------|
| 1 | Login with valid account | Works |
| 2 | Login with invalid account | Fails |
| 3 | Admin adds user | User created |
| 4 | Admin edits user | Changes saved |
| 5 | Admin deletes user | User removed |
| 6 | Admin assigns role | Role updated |
| 7 | BasicUser tries admin page | Access denied |
| 8 | Admin deactivates user | User blocked |
| 9 | Admin reactivates user | User can log in |
| 10 | Check interface | Easy to use |

