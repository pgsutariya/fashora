const LOCAL_STORAGE_WISHLIST_KEY = 'shopify-wishlist';
const LOCAL_STORAGE_DELIMITER = ',';
const BUTTON_ACTIVE_CLASS = 'active';
const GRID_LOADED_CLASS = 'loaded';

const selectorswish = {
  button: '[button-wishlist]',
  grid: '[grid-wishlist]',
  productCard: '.grid__item',
};

document.addEventListener('DOMContentLoaded', () => {
   var text=document.getElementsByClassName("related-products");
   var len=text.length;	
   if(!len)initButtons();
   initGrid();
});

document.addEventListener('shopify-wishlist:updated', (event) => {
  //console.log('[Shopify Wishlist] Wishlist Updated ✅', event.detail.wishlist);
  initGrid();
});

document.addEventListener('shopify-wishlist:init-product-grid', (event) => {
  //console.log('[Shopify Wishlist] Wishlist Product List Loaded ✅', event.detail.wishlist);
});

document.addEventListener('shopify-wishlist:init-buttons', (event) => {
  //console.log('[Shopify Wishlist] Wishlist Buttons Loaded ✅', event.detail.wishlist);
});

const fetchProductCardHTML = (handle) => {
  const productTileTemplateUrl = `/products/${handle}?view=wish`;
  return fetch(productTileTemplateUrl)
  .then((res) => res.text())
  .then((res) => {
    const text = res;
    const parser = new DOMParser();
    const htmlDocument = parser.parseFromString(text, 'text/html');
    const productCard = htmlDocument.documentElement.querySelector(selectorswish.productCard);
    return productCard.outerHTML;
  })
  .catch((err) => console.error(`[Shopify Wishlist] Failed to load content for handle: ${handle}`, err));
};

const setupGrid = async (grid) => {
  const wishlist = getWishlist();
  const requests = wishlist.map(fetchProductCardHTML);
  const responses = await Promise.all(requests);
  const wishlistProductCards = responses.join('');
  grid.innerHTML = wishlistProductCards;
  grid.classList.add(GRID_LOADED_CLASS);
  initButtons();

  const event = new CustomEvent('shopify-wishlist:init-product-grid', {
    detail: { wishlist: wishlist }
  });
  document.dispatchEvent(event);
};

const setupButtons = (buttons) => {
  buttons.forEach((button) => {
    const productHandle = button.dataset.productHandle;
    if (!productHandle) return console.error('[Shopify Wishlist] Missing data-product-handle');

    // Just toggle active state (no event binding here anymore)
    if (wishlistContains(productHandle)) {
      button.classList.add(BUTTON_ACTIVE_CLASS);
    } else {
      button.classList.remove(BUTTON_ACTIVE_CLASS);
    }
  });
};

const observeProductGrid = () => {
  const targetNode = document.querySelector('#product-grid');

  if (!targetNode) return;

  const config = { childList: true, subtree: true };

  let wishlistDebounceTimer;
  const callback = (mutationsList) => {
    let shouldUpdate = false;
    for (const mutation of mutationsList) {
      if (mutation.addedNodes.length > 0) {
        shouldUpdate = true;
        break;
      }
    }
    if (shouldUpdate) {
      clearTimeout(wishlistDebounceTimer);
      wishlistDebounceTimer = setTimeout(() => {
        initButtons(); // Reinit wishlist buttons on new products
        updateWishlistCount();
      }, 150);
    }
  };

  const observer = new MutationObserver(callback);
  observer.observe(targetNode, config);
};
document.addEventListener('DOMContentLoaded', observeProductGrid);

const initGrid = () => {
  const grid = document.querySelector(selectorswish.grid) || false;
  if (grid) setupGrid(grid);
};

const initButtons = () => {
  const buttons = document.querySelectorAll(selectorswish.button) || [];
  if (buttons.length) setupButtons(buttons);
  else return;
  const event = new CustomEvent('shopify-wishlist:init-buttons', {
    detail: { wishlist: getWishlist() }
  });
  document.dispatchEvent(event);
};

const getWishlist = () => {
  const wishlist = localStorage.getItem(LOCAL_STORAGE_WISHLIST_KEY) || false;
  if (wishlist) return wishlist.split(LOCAL_STORAGE_DELIMITER);
  return [];
};

const setWishlist = (array) => {
  const wishlist = array.join(LOCAL_STORAGE_DELIMITER);
  if (array.length) localStorage.setItem(LOCAL_STORAGE_WISHLIST_KEY, wishlist);
  else localStorage.removeItem(LOCAL_STORAGE_WISHLIST_KEY);

  const event = new CustomEvent('shopify-wishlist:updated', {
    detail: { wishlist: array }
  });
  document.dispatchEvent(event);
  updateWishlistCount();  
  return wishlist;
};

const updateWishlist = (handle) => {
  const wishlist = getWishlist();
  const indexInWishlist = wishlist.indexOf(handle);
  if (indexInWishlist === -1) wishlist.push(handle);
  else wishlist.splice(indexInWishlist, 1);
  return setWishlist(wishlist);
};

const wishlistContains = (handle) => {
  const wishlist = getWishlist();
  return wishlist.includes(handle);
};

const resetWishlist = () => {
  return setWishlist([]);
};

const updateWishlistCount = () => {
  const wishlist = getWishlist();
  document.querySelectorAll('[data-js-wishlist-count]').forEach((el) => {
    el.setAttribute('data-js-wishlist-count', wishlist.length);
    el.innerHTML = wishlist.length;
  });

  const displayStyle = wishlist.length === 0 ? 'block' : 'none';
  document.querySelectorAll('.wishlist-text').forEach((el) => {
    el.style.display = displayStyle;
  });
};

document.addEventListener('DOMContentLoaded', () => {
  updateWishlistCount();
});

document.addEventListener('click', function (e) {
  const button = e.target.closest('[button-wishlist]');
  if (!button) return;

  const productHandle = button.dataset.productHandle;
  if (!productHandle) return;

  updateWishlist(productHandle);
  button.classList.toggle(BUTTON_ACTIVE_CLASS);
});