# JavaScript Interactions

This document describes what UI interactions are implemented by the JavaScript in this project.

- Public pages: `assets/js/main.js`
- Admin page: inline `<script>` inside `admin.html`

## Where this script runs

`assets/js/main.js` is included on:

- `main.html`
- `product.html`
- `BMI.html`

The script determines the current page using:

- `page = (window.location.pathname.split('/').pop() || '').toLowerCase()`

and then conditionally enables page-specific features.

## Initialization lifecycle

On `window.load`, the script runs the following initializers (in this order):

1. `initMobileNav()`
2. `initCrossPageLinks()`
3. `initCTAButtons()`
4. `initMainBmiWidget()`
5. `initFAQAccordion()`
6. `hydrateMainBestsellersFromBackend()`
7. `initBackendDataHydration()`
8. `initBMIResultHydration()`
9. `initProductPageInteractions()`
10. `initWishlistToggle()`
11. `initReusableAnimations()`
12. `applyAllResponsiveFixes()`

On `DOMContentLoaded`, it also calls:

- `initReusableAnimations()`

## Shared/global interactions (any page where elements exist)

These are not strictly “page specific”; they activate wherever the required DOM elements are present.

### 1) Mobile navigation

Function: `initMobileNav()`

- Click on the hamburger button `#nav-toggle` toggles the `nav-open` class on `#site-nav`.
- Updates `aria-expanded` accordingly.
- On window resize above 991px, it closes the menu.

### 2) Text-based routing links

Function: `initCrossPageLinks()`

- Scans leaf text nodes inside `#app` and turns exact-match labels into navigation actions:
  - `Home` → `main.html`
  - `Product` → `product.html`
  - `Shop` → `product.html`
  - `Calculate` → `BMI.html`
  - `Recalculate BMI` → `main.html`
- Adds `interactive-click` class and click handlers.

Note: this only applies to non-`<a>` nodes (it skips elements inside links).

### 3) CTA button behaviors (Add to Cart / View Details)

Function: `initCTAButtons()`

- Adds `interactive-click` styling to these labels:
  - `Add to Cart`
  - `View Details`
  - `Write a review`
  - `Load more reviews`
  - `See all 212 reviews` (and similar text content)

Actions:

- **Add to Cart**
  - On click, increments a local counter and shows a toast.
  - Storage key: `nomad_spoon_cart_count`

- **View Details**
  - On click, resolves the product slug from the card (from `data-product-slug`, or by fetching `api/product.php?all=1` and matching by name).
  - Navigates to `product.html?slug=...`.

### 4) Wishlist toggle (heart icons)

Function: `initWishlistToggle()`

- Finds heart icons (SVG path signature match) and makes them clickable.
- Toggles between an inactive heart path and an active heart path.
- Saves per-heart state in localStorage:
  - Key pattern: `nomad_wishlist_<index>` (value is `'1'` or `'0'`).

### 5) Motion/enter animations

Function: `initReusableAnimations()`

- Skips animations if the user has `prefers-reduced-motion: reduce`.
- Adds enter animation classes to page sections.
- Adds “card” animation class to certain visual cards.
- Adds subtle “float” class to select media elements.

### 6) Responsive fixes (layout helpers)

Functions:

- `applyResponsiveWrap()`
  - Forces overflowing row flex containers to `flex-wrap: wrap`.

- `applyResponsiveAbsoluteImages()`
  - For images with inline `position: absolute`, scales width/height/left/top proportionally based on parent width.

These are called via `applyAllResponsiveFixes()`.

## Page-specific interactions

## main.html

### A) BMI widget (editable + slider + API call)

Function: `initMainBmiWidget()` (only runs when `page === 'main.html'`).

**Editable numeric fields**

- Makes the “Age”, “Height (cm)”, and “Weight (kg)” display nodes content-editable.
- Restricts input to digits and `.`
- On blur, clamps values to min/max:
  - Age: 1–120
  - Height: 80–240
  - Weight: 25–300

**Toggle buttons (saved to localStorage)**

- `Male` / `Female`
  - key: `nomad_gender`

- `US` / `Metric`
  - key: `nomad_unit`

**Exercise frequency selector**

- Clickable “dots” and labels.
- Saves selected index to localStorage:
  - key: `nomad_exercise_index` (0–4)
- Draws a custom track bar and updates it on resize.

**Calculate flow**

- Intercepts clicks on the link `a[href="BMI.html"]`.
- Calls the backend:
  - `POST api/bmi.php` with `{ age, height, weight, gender, unit, exerciseIndex }`
- On success:
  - saves the response JSON:
    - key: `nomad_last_bmi_result`
  - navigates to `BMI.html?bmi=<value>`
- On failure:
  - computes BMI client-side and stores fallback values:
    - `nomad_last_bmi`, `nomad_last_age`, `nomad_last_height`, `nomad_last_weight`
  - navigates to `BMI.html?bmi=<value>`

### B) FAQ accordion

Function: `initFAQAccordion()` (only runs on `main.html`).

- Finds the `FAQ` section.
- For each FAQ card:
  - Injects an answer node (`.faq-answer`) and keeps it hidden by default.
  - Clicking a card toggles open/closed:
    - Shows/hides answer
    - Changes background

### C) Homepage product hydration (backend-driven images/cards)

Function: `hydrateMainBestsellersFromBackend()` (only runs on `main.html`).

- Fetches product catalog:
  - `GET api/product.php?all=1`
- Updates:
  - hero images (top rated products)
  - category cards become clickable and navigate to `product.html?slug=...`
  - “Discover our bestsellers” cards are filled with backend data (name/weight/price/images).

## product.html

### A) Backend data hydration (product details, similar products, reviews)

Function: `initBackendDataHydration()` (runs on `product.html` and `BMI.html`).

On `product.html`:

- Fetches product by slug:
  - `GET api/product.php?slug=<slug>`
- Replaces static page text with backend values:
  - product name, description, weight, value proposition, price, mrp, rating, review count
- Hydrates:
  - product gallery (`hydrateProductGallery`)
  - review list (`hydrateProductReviews`)
  - similar product cards (`hydrateProductCards('Similar Products', ...)`)

### B) Product gallery thumbnails

Functions: `hydrateProductGallery()` + `bindProductThumbInteractions()`

- Sets the main image to the first backend image.
- Generates thumbnail images.
- Clicking a thumbnail replaces the main image and highlights the active thumbnail.

### C) Add to Cart + quantity control (main product)

Function: `initProductPageInteractions()`

- Click “Add to Cart”:
  - increments `nomad_spoon_cart_count`
  - shows a toast
  - swaps UI from Add button → quantity controls

- Quantity controls:
  - minus button decrements qty down to 1
  - plus button increments qty up to 99

Note: qty changes are UI-only; they are not persisted to storage or sent to backend.

### D) Similar products: inline qty controls

Function: `initProductPageInteractions()`

- In the “Similar Products” section:
  - clicking “Add to Cart” shows an inline qty control (same +/- behavior)
  - clicking the button background also adds to cart and switches to qty mode

### E) Reviews section actions

Function: `initProductPageInteractions()`

- “Load more reviews” is hidden if present.

- “See all <n> reviews”:
  - scrolls smoothly to “Reviews & Testimonials”.

- “Write a review”:
  - injects an inline review form under the Reviews header.
  - form fields:
    - name
    - rating (1–5)
    - review text
  - submit validation:
    - name required
    - review text required
  - on submit:
    1) fetches the current product to get `product.id`:
       - `GET api/product.php?slug=<slug>`
    2) creates a review:
       - `POST api/admin/reviews.php`
    3) refreshes reviews from backend and re-renders the list:
       - `GET api/product.php?slug=<slug>`
    4) shows success toast and removes the form.

## BMI.html

### A) Backend data hydration for product cards

Function: `initBackendDataHydration()`

- Fetches by slug in the URL (defaults to `berry-nut-energy-bar` if none):
  - `GET api/product.php?slug=<slug>`
- Uses `suggestions` / `similar` from the payload to fill product cards:
  - “Our Suggestions for you”
  - “You can also try them”

### B) BMI result hydration (client-side rendering)

Function: `initBMIResultHydration()` (only runs on `BMI.html`).

- Preferred path: uses backend response saved from main page:
  - reads `nomad_last_bmi_result` and updates score/status/description styles.

- Fallback path: uses BMI from query param `?bmi=...` or `nomad_last_bmi`.
  - computes category (`Under Weight` / `Normal` / `Over Weight` / `Obese`)
  - updates:
    - score number
    - status label
    - description text
    - ring/pill outline + background colors

## admin.html (inline script)

`admin.html` does not load `assets/js/main.js`. It uses an inline `<script>` that implements a small admin panel for managing products and reviews.

### Products CRUD

- Initial load: `GET api/admin/products.php` renders the products table.
- Row actions:
  - **Delete**: `DELETE api/admin/products.php?id=<id>` then reloads the table.
  - **Edit**: `GET api/admin/products.php?id=<id>` then populates the product form.
- Buttons:
  - **Create product**: `POST api/admin/products.php` (form payload excluding `id`) then reloads.
  - **Update product**: requires `id`, then `PUT api/admin/products.php?id=<id>` then reloads.

### Reviews CRUD

- Initial load: `GET api/admin/reviews.php` renders the reviews table.
- Row actions:
  - **Delete**: `DELETE api/admin/reviews.php?id=<id>` then reloads the table.
  - **Edit**: `GET api/admin/reviews.php?id=<id>` then populates the review form fields (`id`, `product_id`, `user_name`, `rating`, `review_text`).
- Buttons:
  - **Create review**: `POST api/admin/reviews.php` (form payload excluding `id`) then reloads.
  - **Update review**: requires `id`, then `PUT api/admin/reviews.php?id=<id>` then reloads.

## LocalStorage keys used

- Cart:
  - `nomad_spoon_cart_count`

- BMI widget selections:
  - `nomad_gender`
  - `nomad_unit`
  - `nomad_exercise_index`

- BMI results:
  - `nomad_last_bmi_result` (JSON from backend)
  - `nomad_last_bmi` (number string)
  - `nomad_last_age`
  - `nomad_last_height`
  - `nomad_last_weight`

- Wishlist:
  - `nomad_wishlist_<index>`

## Backend/API endpoints called

- Catalog:
  - `GET api/product.php?all=1`

- Product details + reviews:
  - `GET api/product.php?slug=<slug>`

- BMI calculation:
  - `POST api/bmi.php`

- Admin CRUD (used by `admin.html` inline script):
  - `GET/POST/PUT/DELETE api/admin/products.php`
  - `GET/POST/PUT/DELETE api/admin/reviews.php`

- Review creation (used by product page review form):
  - `POST api/admin/reviews.php`
