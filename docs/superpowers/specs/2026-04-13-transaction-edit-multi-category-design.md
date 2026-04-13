# Transaction Edit & Multi-Category Design

## Overview

Add inline transaction editing via a slide-out panel, support multiple categories per transaction, and allow users to manage categories (add/delete) from within the edit panel.

---

## Data Model

### Category Storage (Firestore)

```
users/{userId}/categories/{categoryId}
  - name: string (lowercase, unique per user)
  - createdAt: Date
```

**Default categories** seeded on first scan: `food`, `shopping`, `transport`, `entertainment`, `other`

### Transaction Schema Change

```typescript
// Before
category: Category  // single string

// After
categories: string[]  // array of category names (lowercase)
```

### Type Changes

```typescript
export interface Category {
  id: string;
  userId: string;
  name: string;
  createdAt: Date;
}

export interface Transaction {
  // ...
  categories: string[];  // was: category: Category
}
```

---

## API Changes

### `GET /api/categories`
Returns user's categories.
```json
{ "categories": [{ "id": "...", "name": "food", "createdAt": "..." }] }
```

### `POST /api/categories`
Create a new category.
```json
// Request: { "name": "utilities" }
// Response: { "id": "...", "name": "utilities", "createdAt": "..." }
```

### `DELETE /api/categories?id={id}`
Delete a category by ID. Fails if category is in use by any transaction.

### `PATCH /api/transactions`
Update a transaction (merchant, amount, date, categories).
```json
// Request: { "id": "...", "merchant": "...", "amount": 50000, "date": "...", "categories": ["food", "shopping"] }
// Response: { "success": true }
```

---

## UI: Slide-Out Edit Panel

### Trigger
Click on any transaction row in History → panel slides in from right.

### Panel Content

**Header:**
- Transaction merchant (editable text input)
- Close button (×)

**Fields:**
- **Amount** - number input with IDR formatting
- **Date** - date picker
- **Categories** - chip-based display with inline add/delete

**Category Chips:**
- Each assigned category shown as a colored chip with × button
- Clicking × removes that category
- Input field below chips to add new category
- Typing shows suggestions from existing categories
- Press Enter or click suggestion to add
- If typed name doesn't exist, show "Create '[name]'" option

**Footer:**
- Save button (primary)
- Cancel button (secondary)

### Behavior
- Panel width: ~400px
- Backdrop dims the rest of the page (click to close)
- Changes are saved on "Save" only
- Optimistic update on save (update UI immediately, revert on error)

---

## UI: History Table Changes

### Display
When a transaction has multiple categories, show ALL of them as small colored chips in the category cell:

```
[Food] [Shopping]
```

### Chip Colors
Match the category's color if stored, or use a deterministic color based on category name.

### Filtering
- Filter by single category still works (show transactions that have that category in their array)

---

## UI: Categories Page Changes

### Display
- Remove hardcoded category definitions
- Fetch categories from Firestore
- Show category cards based on user's actual categories

### Empty State
- If user deletes all categories, show message: "Add your first category to get started"
- Cannot delete a category that is in use

---

## Implementation Order

1. Add `categories` subcollection API (GET, POST, DELETE)
2. Update transaction API (PATCH) and types
3. Update settings scan to seed default categories
4. Build slide-out panel component
5. Wire up history page → slide-out panel
6. Update categories page to use dynamic data
7. Update dashboard to handle multi-category transactions
