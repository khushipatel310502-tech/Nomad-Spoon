(function () {
  const page = (window.location.pathname.split('/').pop() || '').toLowerCase();
  const API_BASE = 'api';

  const pxFromStyle = (styleText, prop) => {
    if (!styleText) return null;
    const re = new RegExp(`${prop}\\s*:\\s*([0-9.]+)px`, 'i');
    const m = styleText.match(re);
    return m ? parseFloat(m[1]) : null;
  };

  const byLeafText = (text, root = document) => {
    const nodes = root.querySelectorAll('div, span, a');
    for (const node of nodes) {
      if (node.childElementCount > 0) continue;
      if ((node.textContent || '').trim() === text) return node;
    }
    return null;
  };

  const toNumber = (text, fallback) => {
    const v = Number(String(text || '').replace(/[^0-9.]/g, ''));
    return Number.isFinite(v) ? v : fallback;
  };

  const slugify = (value) => String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  const apiRequest = async (path, options = {}) => {
    const response = await fetch(`${API_BASE}/${path}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      },
      ...options
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      const message = payload && payload.error ? payload.error : 'Request failed';
      throw new Error(message);
    }
    return payload;
  };

  const leafNodes = (root = document) => Array.from(root.querySelectorAll('div, span, a')).filter((n) => n.childElementCount === 0);

  const resolveImageList = (product) => {
    if (!product || typeof product !== 'object') return [];

    const fromArray = Array.isArray(product.image_urls)
      ? product.image_urls.map((v) => String(v || '').trim()).filter(Boolean)
      : [];
    if (fromArray.length) return fromArray;

    const raw = String(product.image_url || '').trim();
    if (!raw) return [];

    if (raw.startsWith('[')) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const images = parsed.map((v) => String(v || '').trim()).filter(Boolean);
          if (images.length) return images;
        }
      } catch (_e) {
        // fall through to split parsing
      }
    }

    const split = raw.split(/\s*(?:,|\|)\s*/).map((v) => v.trim()).filter(Boolean);
    return split.length ? split : [raw];
  };

  const bindProductThumbInteractions = () => {
    const mainImage = document.querySelector('#app img[style*="height: 580px"]');
    if (!mainImage || !mainImage.parentElement) return;

    const thumbStrip = mainImage.parentElement.querySelector('div[style*="overflow: hidden"][style*="align-items: center"]');
    if (!thumbStrip) return;

    const rawThumbs = Array.from(thumbStrip.querySelectorAll('img'));
    if (!rawThumbs.length) return;

    // Normalize into wrapper boxes so active border is never clipped.
    rawThumbs.forEach((img) => {
      const currentParent = img.parentElement;
      if (currentParent && currentParent.classList.contains('thumb-option')) return;

      const wrapper = document.createElement('div');
      wrapper.className = 'thumb-option interactive-click';
      wrapper.style.width = '80px';
      wrapper.style.height = '80px';
      wrapper.style.borderRadius = '8px';
      wrapper.style.display = 'flex';
      wrapper.style.alignItems = 'center';
      wrapper.style.justifyContent = 'center';

      img.style.width = '100%';
      img.style.height = '100%';
      img.style.objectFit = 'contain';

      if (currentParent) {
        currentParent.insertBefore(wrapper, img);
      } else {
        thumbStrip.appendChild(wrapper);
      }
      wrapper.appendChild(img);
    });

    const thumbOptions = Array.from(thumbStrip.querySelectorAll('.thumb-option'));
    if (!thumbOptions.length) return;

    const sameImage = (a, b) => {
      const left = String(a || '').split('/').pop();
      const right = String(b || '').split('/').pop();
      return left && right && left === right;
    };

    const markActiveThumb = (activeSrc) => {
      thumbOptions.forEach((option) => {
        const img = option.querySelector('img');
        const active = img ? sameImage(img.getAttribute('src'), activeSrc) : false;
        option.classList.toggle('active', active);
      });
    };

    markActiveThumb(mainImage.getAttribute('src'));
    thumbOptions.forEach((option) => {
      const img = option.querySelector('img');
      if (!img) return;
      if (option.dataset.thumbBound === 'true') return;
      option.addEventListener('click', () => {
        const nextSrc = img.getAttribute('src');
        if (!nextSrc) return;
        mainImage.setAttribute('src', nextSrc);
        markActiveThumb(nextSrc);
      });
      option.dataset.thumbBound = 'true';
    });
  };

  const hydrateProductGallery = (product) => {
    const images = resolveImageList(product);
    if (!images.length) return;

    const mainImage = document.querySelector('#app img[style*="height: 580px"]');
    if (!mainImage || !mainImage.parentElement) return;

    const thumbStrip = mainImage.parentElement.querySelector('div[style*="overflow: hidden"][style*="align-items: center"]');

    mainImage.setAttribute('src', images[0]);
    mainImage.style.background = 'transparent';
    if (mainImage.parentElement) {
      mainImage.parentElement.style.background = 'transparent';
    }

    if (thumbStrip) {
      thumbStrip.innerHTML = '';
      images.forEach((src) => {
        const img = document.createElement('img');
        img.setAttribute('src', src);
        img.style.width = '80px';
        img.style.height = '80px';
        img.style.position = 'relative';
        img.style.borderRadius = '8px';
        img.style.background = 'transparent';
        thumbStrip.appendChild(img);
      });
    }

    bindProductThumbInteractions();
  };

  const hydrateProductReviews = (reviews) => {
    const reviewsHeading = byLeafText('Reviews & Testimonials');
    if (!reviewsHeading) return;

    const reviewsSection = reviewsHeading.closest('div[style*="flex-direction: column"][style*="gap: 16px"]');
    if (!reviewsSection) return;

    const photosLabel = byLeafText('Customer Photos & Videos', reviewsSection);
    const photosBlock = photosLabel
      ? photosLabel.closest('div[style*="flex-direction: column"][style*="gap: 8px"]')
      : null;

    const anchor = photosBlock || reviewsSection.children[1] || null;
    if (!anchor) return;

    while (anchor.nextElementSibling) {
      anchor.nextElementSibling.remove();
    }

    const list = Array.isArray(reviews) ? reviews : [];
    if (!list.length) {
      const empty = document.createElement('div');
      empty.style.alignSelf = 'stretch';
      empty.style.color = '#616161';
      empty.style.fontSize = '16px';
      empty.style.fontFamily = 'Inter';
      empty.style.fontWeight = '400';
      empty.style.lineHeight = '22.40px';
      empty.style.wordWrap = 'break-word';
      empty.textContent = 'No reviews yet.';
      reviewsSection.appendChild(empty);
      return;
    }

    list.forEach((review) => {
      const card = document.createElement('div');
      card.style.alignSelf = 'stretch';
      card.style.paddingBottom = '16px';
      card.style.borderBottom = '1px #F5F5F5 solid';
      card.style.flexDirection = 'column';
      card.style.justifyContent = 'flex-start';
      card.style.alignItems = 'flex-start';
      card.style.gap = '8px';
      card.style.display = 'flex';

      const header = document.createElement('div');
      header.style.alignSelf = 'stretch';
      header.style.justifyContent = 'space-between';
      header.style.alignItems = 'flex-start';
      header.style.display = 'inline-flex';

      const left = document.createElement('div');
      left.style.flexDirection = 'column';
      left.style.justifyContent = 'flex-start';
      left.style.alignItems = 'flex-start';
      left.style.gap = '4px';
      left.style.display = 'inline-flex';

      const stars = document.createElement('div');
      stars.style.color = '#FFC41F';
      stars.style.fontSize = '14px';
      stars.style.lineHeight = '14px';
      stars.textContent = '★★★★★';

      const name = document.createElement('div');
      name.style.color = '#212121';
      name.style.fontSize = '16px';
      name.style.fontFamily = 'Inter';
      name.style.fontWeight = '500';
      name.style.lineHeight = '26.60px';
      name.style.wordWrap = 'break-word';
      name.textContent = String(review.user_name || 'Customer');

      left.appendChild(stars);
      left.appendChild(name);

      const when = document.createElement('div');
      when.style.color = '#757575';
      when.style.fontSize = '11px';
      when.style.fontFamily = 'Inter';
      when.style.fontWeight = '400';
      when.style.lineHeight = '13.20px';
      when.style.wordWrap = 'break-word';
      when.textContent = String(review.created_label || 'recently');

      header.appendChild(left);
      header.appendChild(when);

      const body = document.createElement('div');
      body.style.alignSelf = 'stretch';
      body.style.color = '#616161';
      body.style.fontSize = '16px';
      body.style.fontFamily = 'Inter';
      body.style.fontWeight = '400';
      body.style.lineHeight = '22.40px';
      body.style.wordWrap = 'break-word';
      body.textContent = `"${String(review.review_text || '')}"`;

      card.appendChild(header);
      card.appendChild(body);
      reviewsSection.appendChild(card);
    });
  };

  const setLeafTextByExact = (oldText, newText, occurrence = 0, root = document) => {
    const nodes = leafNodes(root).filter((n) => (n.textContent || '').trim() === oldText);
    const target = nodes[occurrence];
    if (target) target.textContent = newText;
    return Boolean(target);
  };

  const setLeafTextByContains = (match, newText, occurrence = 0, root = document) => {
    const nodes = leafNodes(root).filter((n) => (n.textContent || '').includes(match));
    const target = nodes[occurrence];
    if (target) target.textContent = newText;
    return Boolean(target);
  };

  const showToast = (message) => {
    let toast = document.getElementById('app-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'app-toast';
      toast.className = 'app-toast';
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(window.__toastTimer);
    window.__toastTimer = setTimeout(() => toast.classList.remove('show'), 1500);
  };

  const addCartItem = () => {
    const key = 'nomad_spoon_cart_count';
    const count = Number(localStorage.getItem(key) || '0') + 1;
    localStorage.setItem(key, String(count));
    showToast(`Added to cart (${count})`);
  };

  let productCatalogPromise = null;

  const getProductCatalog = async () => {
    if (!productCatalogPromise) {
      productCatalogPromise = apiRequest('product.php?all=1', { method: 'GET' })
        .then((data) => (Array.isArray(data.products) ? data.products : []))
        .catch(() => []);
    }
    return productCatalogPromise;
  };

  const looksLikeProductCard = (node) => {
    if (!node || node.nodeType !== 1) return false;
    const text = (node.textContent || '').trim();
    if (!text.includes('Add to Cart') || !text.includes('View Details')) return false;
    return true;
  };

  const findProductCard = (fromNode) => {
    let node = fromNode;
    while (node && node !== document.body) {
      if (node.dataset && node.dataset.productSlug) return node;
      if (looksLikeProductCard(node)) return node;
      node = node.parentElement;
    }
    return null;
  };

  const extractCardProductName = (card) => {
    if (!card) return '';
    const textNodes = leafNodes(card);
    const nameNode = textNodes.find((n) => {
      const text = (n.textContent || '').trim();
      return text
        && !text.startsWith('₹')
        && !/\d+g$/i.test(text)
        && !/^\d+(\.\d+)?$/.test(text)
        && text !== 'Add to Cart'
        && text !== 'View Details';
    });
    return (nameNode && nameNode.textContent ? nameNode.textContent : '').trim();
  };

  const resolveCardSlug = async (card) => {
    if (!card) return '';
    if (card.dataset && card.dataset.productSlug) return card.dataset.productSlug;

    const name = extractCardProductName(card);
    const guessed = slugify(name);

    const products = await getProductCatalog();
    if (!products.length) return guessed;

    const byExactName = products.find((p) => String(p.name || '').trim().toLowerCase() === name.toLowerCase());
    if (byExactName && byExactName.slug) {
      card.dataset.productSlug = byExactName.slug;
      return byExactName.slug;
    }

    const bySlugGuess = products.find((p) => String(p.slug || '').toLowerCase() === guessed);
    if (bySlugGuess && bySlugGuess.slug) {
      card.dataset.productSlug = bySlugGuess.slug;
      return bySlugGuess.slug;
    }

    const fallback = products[0] && products[0].slug ? String(products[0].slug) : guessed;
    if (fallback) card.dataset.productSlug = fallback;
    return fallback;
  };

  const applyResponsiveAbsoluteImages = () => {
    const imgs = document.querySelectorAll('#app img[style*="position: absolute"]');

    imgs.forEach((img) => {
      const parent = img.offsetParent || img.parentElement;
      if (!parent) return;

      const parentStyle = parent.getAttribute('style') || '';
      const imgStyle = img.getAttribute('style') || '';

      if (!img.dataset.baseWidth) {
        const bw = pxFromStyle(imgStyle, 'width');
        const bh = pxFromStyle(imgStyle, 'height');
        const bl = pxFromStyle(imgStyle, 'left');
        const bt = pxFromStyle(imgStyle, 'top');
        img.dataset.baseWidth = bw != null ? String(bw) : '';
        img.dataset.baseHeight = bh != null ? String(bh) : '';
        img.dataset.baseLeft = bl != null ? String(bl) : '';
        img.dataset.baseTop = bt != null ? String(bt) : '';
      }

      const baseParentWidth = pxFromStyle(parentStyle, 'width') || parent.clientWidth;
      if (!baseParentWidth) return;

      const ratio = Math.max(0.3, Math.min(1, parent.clientWidth / baseParentWidth));

      const bw = parseFloat(img.dataset.baseWidth || 'NaN');
      const bh = parseFloat(img.dataset.baseHeight || 'NaN');
      const bl = parseFloat(img.dataset.baseLeft || 'NaN');
      const bt = parseFloat(img.dataset.baseTop || 'NaN');

      if (!Number.isNaN(bw)) img.style.width = `${bw * ratio}px`;
      if (!Number.isNaN(bh)) img.style.height = `${bh * ratio}px`;
      if (!Number.isNaN(bl)) img.style.left = `${bl * ratio}px`;
      if (!Number.isNaN(bt)) img.style.top = `${bt * ratio}px`;
    });
  };

  const applyResponsiveWrap = () => {
    const nodes = document.querySelectorAll('#app [style*="display: inline-flex"], #app [style*="display: flex"]');
    nodes.forEach((el) => {
      const cs = window.getComputedStyle(el);
      if (!cs.display.includes('flex')) return;
      if (!cs.flexDirection.startsWith('row')) return;

      el.style.maxWidth = '100%';
      if (el.scrollWidth > el.clientWidth + 1) {
        el.style.flexWrap = 'wrap';
      }
    });
  };

  const initMobileNav = () => {
    const nav = document.getElementById('site-nav');
    const btn = document.getElementById('nav-toggle');
    if (!nav || !btn) return;

    const closeNav = () => {
      nav.classList.remove('nav-open');
      btn.setAttribute('aria-expanded', 'false');
    };

    btn.addEventListener('click', () => {
      const isOpen = nav.classList.toggle('nav-open');
      btn.setAttribute('aria-expanded', String(isOpen));
    });

    window.addEventListener('resize', () => {
      if (window.innerWidth > 991) closeNav();
    });
  };

  const initCrossPageLinks = () => {
    const textRoutes = new Map([
      ['Home', 'main.html'],
      ['Product', 'product.html'],
      ['Shop', 'product.html'],
      ['Calculate', 'BMI.html'],
      ['Recalculate BMI', 'main.html']
    ]);

    const nodes = document.querySelectorAll('#app div, #app span');
    nodes.forEach((el) => {
      if (el.childElementCount > 0) return;
      if (el.closest('a')) return;

      const label = (el.textContent || '').trim();
      const href = textRoutes.get(label);
      if (!href) return;

      el.style.cursor = 'pointer';
      el.classList.add('interactive-click');
      if (el.dataset.routeBound === 'true') return;

      el.addEventListener('click', () => {
        window.location.href = href;
      });
      el.dataset.routeBound = 'true';
    });
  };

  const initCTAButtons = () => {
    const textNodes = document.querySelectorAll('#app div, #app span');
    textNodes.forEach((el) => {
      if (el.childElementCount > 0) return;
      const label = (el.textContent || '').trim();
      if (label === 'Add to Cart' || label === 'View Details' || label === 'Write a review' || label === 'Load more reviews' || label === 'See all 212 reviews') {
        el.classList.add('interactive-click');
        if (el.parentElement) el.parentElement.classList.add('interactive-click');
      }

      if (label === 'Add to Cart' && el.dataset.actionBound !== 'true') {
        el.addEventListener('click', (e) => {
          e.preventDefault();
          addCartItem();
        });
        el.dataset.actionBound = 'true';
      }

      if (label === 'View Details' && el.dataset.actionBound !== 'true') {
        el.addEventListener('click', async () => {
          const card = findProductCard(el);
          const slug = await resolveCardSlug(card);
          window.location.href = slug ? `product.html?slug=${encodeURIComponent(slug)}` : 'product.html';
        });
        el.dataset.actionBound = 'true';
      }
    });
  };

  const initMainBmiWidget = () => {
    if (page !== 'main.html') return;

    const findInputByLabel = (labelText) => {
      const label = byLeafText(labelText, document.getElementById('app') || document);
      if (!label) return null;
      const field = label.closest('[data-property-1="Filled"]');
      if (!field) return null;
      const values = Array.from(field.querySelectorAll('div'))
        .filter((n) => n.childElementCount === 0)
        .filter((n) => /^[0-9.]+$/.test((n.textContent || '').trim()));
      return values[0] || null;
    };

    const ageNode = findInputByLabel('Enter your Age');
    const heightNode = findInputByLabel('Height (cm)');
    const weightNode = findInputByLabel('Weight (kg)');

    [ageNode, heightNode, weightNode].forEach((node, i) => {
      if (!node) return;
      node.contentEditable = 'true';
      node.spellcheck = false;
      node.classList.add('editable-input');
      node.setAttribute('role', 'spinbutton');
      node.setAttribute('inputmode', 'decimal');

      const defaults = [23, 159, 55];
      const min = [1, 80, 25][i];
      const max = [120, 240, 300][i];

      const normalize = () => {
        const value = toNumber(node.textContent, defaults[i]);
        const clamped = Math.min(max, Math.max(min, value));
        node.textContent = String(clamped);
      };

      node.addEventListener('keypress', (e) => {
        if (!/[0-9.]/.test(e.key)) e.preventDefault();
      });
      node.addEventListener('blur', normalize);
      node.addEventListener('paste', (e) => {
        e.preventDefault();
        const text = (e.clipboardData || window.clipboardData).getData('text');
        const cleaned = text.replace(/[^0-9.]/g, '');
        document.execCommand('insertText', false, cleaned);
      });
    });

    const initTogglePair = (leftLabel, rightLabel, storageKey) => {
      const left = byLeafText(leftLabel);
      const right = byLeafText(rightLabel);
      if (!left || !right) return;
      const leftBtn = left.parentElement;
      const rightBtn = right.parentElement;
      if (!leftBtn || !rightBtn) return;

      const apply = (selected) => {
        const leftActive = selected === leftLabel;
        leftBtn.style.background = leftActive ? 'rgb(84, 109, 70)' : 'transparent';
        left.style.color = leftActive ? '#fff' : '#616161';
        left.style.fontWeight = leftActive ? '500' : '400';

        rightBtn.style.background = !leftActive ? 'rgb(84, 109, 70)' : 'transparent';
        right.style.color = !leftActive ? '#fff' : '#616161';
        right.style.fontWeight = !leftActive ? '500' : '400';
      };

      const saved = localStorage.getItem(storageKey) || rightLabel;
      apply(saved);

      [leftBtn, rightBtn].forEach((btn, idx) => {
        btn.classList.add('interactive-click');
        btn.addEventListener('click', () => {
          const val = idx === 0 ? leftLabel : rightLabel;
          localStorage.setItem(storageKey, val);
          apply(val);
        });
      });
    };

    initTogglePair('Male', 'Female', 'nomad_gender');
    initTogglePair('US', 'Metric', 'nomad_unit');

    const exerciseTitle = byLeafText('How much do you exercise per week ?');
    if (exerciseTitle) {
      const section = exerciseTitle.closest('div[style*="flex-direction: column"]');
      const sliderRow = section && section.querySelector('div[style*="position: relative"]');
      const labelsRow = section && section.querySelector('div[style*="justify-content: space-between"]');
      const dots = section ? Array.from(section.querySelectorAll('div[data-svg-wrapper]')).filter((d) => d.querySelector('svg[width="20"]')) : [];
      const labels = labelsRow ? Array.from(labelsRow.children) : [];
      let selectedIndex = 2;

      let baseTrack = null;
      let activeTrack = null;

      if (sliderRow && dots.length >= 2) {
        const legacyLines = Array.from(sliderRow.children).filter((el) => {
          const style = el.getAttribute('style') || '';
          return style.includes('position: absolute') && style.includes('height: 0px');
        });
        legacyLines.forEach((line) => {
          line.style.display = 'none';
        });

        baseTrack = document.createElement('div');
        activeTrack = document.createElement('div');

        Object.assign(baseTrack.style, {
          position: 'absolute',
          top: '9px',
          height: '3px',
          background: '#DADADA',
          borderRadius: '999px',
          zIndex: '0',
          pointerEvents: 'none'
        });

        Object.assign(activeTrack.style, {
          position: 'absolute',
          top: '9px',
          height: '3px',
          background: '#546D46',
          borderRadius: '999px',
          zIndex: '1',
          pointerEvents: 'none'
        });

        sliderRow.appendChild(baseTrack);
        sliderRow.appendChild(activeTrack);

        dots.forEach((dot) => {
          dot.style.position = 'relative';
          dot.style.zIndex = '2';
        });
      }

      const updateTrack = () => {
        if (!sliderRow || !baseTrack || !activeTrack || dots.length < 2) return;
        const rowRect = sliderRow.getBoundingClientRect();
        const centers = dots.map((dot) => {
          const rect = dot.getBoundingClientRect();
          return rect.left - rowRect.left + rect.width / 2;
        });
        const start = centers[0];
        const end = centers[centers.length - 1];
        const current = centers[Math.max(0, Math.min(selectedIndex, centers.length - 1))];

        baseTrack.style.left = `${start}px`;
        baseTrack.style.width = `${Math.max(0, end - start)}px`;
        activeTrack.style.left = `${start}px`;
        activeTrack.style.width = `${Math.max(0, current - start)}px`;
      };

      const applyExercise = () => {
        dots.forEach((dot, idx) => {
          const circles = dot.querySelectorAll('circle');
          if (circles.length) {
            const c = circles[circles.length - 1];
            c.setAttribute('fill', idx <= selectedIndex ? '#546D46' : 'white');
          }
          dot.style.cursor = 'pointer';
          dot.style.transform = idx === selectedIndex ? 'scale(1.1)' : 'scale(1)';
        });
        labels.forEach((label, idx) => {
          label.style.fontWeight = idx === selectedIndex ? '700' : '500';
          label.style.cursor = 'pointer';
        });
        updateTrack();
      };

      dots.forEach((dot, idx) => dot.addEventListener('click', () => {
        selectedIndex = idx;
        localStorage.setItem('nomad_exercise_index', String(idx));
        applyExercise();
      }));
      labels.forEach((label, idx) => label.addEventListener('click', () => {
        selectedIndex = idx;
        localStorage.setItem('nomad_exercise_index', String(idx));
        applyExercise();
      }));

      const saved = Number(localStorage.getItem('nomad_exercise_index'));
      if (Number.isFinite(saved) && saved >= 0 && saved <= 4) selectedIndex = saved;
      applyExercise();
      window.addEventListener('resize', updateTrack);
    }

    const calcLink = document.querySelector('a[href="BMI.html"]');
    if (!calcLink || !ageNode || !heightNode || !weightNode) return;
    calcLink.addEventListener('click', async (e) => {
      e.preventDefault();
      const age = toNumber(ageNode.textContent, 23);
      const heightCm = toNumber(heightNode.textContent, 159);
      const weightKg = toNumber(weightNode.textContent, 55);

      const gender = localStorage.getItem('nomad_gender') || 'Female';
      const unit = localStorage.getItem('nomad_unit') || 'Metric';
      const exerciseIndex = Number(localStorage.getItem('nomad_exercise_index') || '2');

      try {
        const result = await apiRequest('bmi.php', {
          method: 'POST',
          body: JSON.stringify({
            age,
            height: heightCm,
            weight: weightKg,
            gender,
            unit,
            exerciseIndex
          })
        });

        localStorage.setItem('nomad_last_bmi_result', JSON.stringify(result));
        window.location.href = `BMI.html?bmi=${encodeURIComponent(String(result.bmi))}`;
      } catch (err) {
        const bmi = weightKg / Math.pow(heightCm / 100, 2);
        const rounded = Math.round(bmi * 10) / 10;
        localStorage.setItem('nomad_last_bmi', String(rounded));
        localStorage.setItem('nomad_last_age', String(age));
        localStorage.setItem('nomad_last_height', String(heightCm));
        localStorage.setItem('nomad_last_weight', String(weightKg));
        window.location.href = `BMI.html?bmi=${encodeURIComponent(String(rounded))}`;
      }
    });
  };

  const initFAQAccordion = () => {
    if (page !== 'main.html') return;
    const faqTitle = byLeafText('FAQ');
    if (!faqTitle) return;
    const section = faqTitle.closest('div[style*="flex-direction: column"]');
    if (!section) return;
    const list = Array.from(section.querySelectorAll('div[data-property-1="False"]'));
    const answerMap = {
      'Can I return or exchange Nomad Spoon product ?': 'Yes. You can request a return or exchange within 7 days of delivery if the item is unopened and in original packaging.',
      'What if my product arrives damaged or defective?': 'Please contact support with a photo of the package. We will replace or refund the item quickly.',
      'How long does delivery take?': 'Standard delivery is usually 3-6 business days depending on your location.',
      'Can I cancel my order?': 'Orders can be canceled before dispatch. After dispatch, use the return option once delivered.'
    };

    list.forEach((card) => {
      const question = Array.from(card.querySelectorAll('div'))
        .find((n) => n.childElementCount === 0 && /\?$/.test((n.textContent || '').trim()));
      if (!question) return;

      const answer = document.createElement('div');
      answer.className = 'faq-answer';
      answer.textContent = answerMap[(question.textContent || '').trim()] || 'Please contact support for more details.';
      answer.style.display = 'none';
      card.appendChild(answer);
      card.classList.add('interactive-click');

      card.addEventListener('click', () => {
        const isOpen = card.dataset.open === 'true';
        card.dataset.open = String(!isOpen);
        answer.style.display = isOpen ? 'none' : 'block';
        card.style.background = isOpen ? '#F7F7F7' : '#EEF4EA';
      });
    });
  };

  const initBMIResultHydration = () => {
    if (page !== 'bmi.html') return;

    const backendResultRaw = localStorage.getItem('nomad_last_bmi_result');
    if (backendResultRaw) {
      try {
        const backendResult = JSON.parse(backendResultRaw);
        if (backendResult && Number.isFinite(Number(backendResult.bmi))) {
          const scoreNode = byLeafText('17');
          if (scoreNode) scoreNode.textContent = String(backendResult.bmi);

          const statusNode = byLeafText('Under Weight');
          const descNode = Array.from(document.querySelectorAll('#app div'))
            .find((n) => n.childElementCount === 0 && (n.textContent || '').includes('Based on your BMI'));

          if (statusNode) {
            statusNode.textContent = backendResult.category || 'Normal';
            const pill = statusNode.parentElement;
            if (pill) {
              pill.style.outlineColor = backendResult.color || '#2E7D32';
              pill.style.background = backendResult.background || 'rgba(46, 125, 50, 0.15)';
            }
          }
          if (descNode && backendResult.description) descNode.innerHTML = backendResult.description;

          const scoreRing = scoreNode && scoreNode.parentElement;
          if (scoreRing) {
            scoreRing.style.outlineColor = backendResult.color || '#2E7D32';
            scoreRing.style.background = backendResult.background || 'rgba(46, 125, 50, 0.15)';
          }
        }
      } catch (_e) {
        // ignore parse failure and continue with fallback calculation hydration.
      }
    }

    const params = new URLSearchParams(window.location.search);
    const parsed = Number(params.get('bmi') || localStorage.getItem('nomad_last_bmi') || '');
    if (!Number.isFinite(parsed)) return;

    const score = Math.round(parsed * 10) / 10;
    const scoreNode = byLeafText('17');
    if (scoreNode) scoreNode.textContent = String(score);

    const statusNode = byLeafText('Under Weight');
    const descNode = Array.from(document.querySelectorAll('#app div'))
      .find((n) => n.childElementCount === 0 && (n.textContent || '').includes('Based on your BMI'));

    let status = 'Normal';
    let color = '#00A6AA';
    let bg = 'rgba(0, 166, 170, 0.15)';
    let desc = 'Based on your BMI, we recommend balanced nutrition for sustained energy and recovery during trekking.';

    if (score < 18.5) {
      status = 'Under Weight';
      color = '#00A6AA';
      bg = 'rgba(0, 166, 170, 0.15)';
      desc = 'Based on your BMI, we recommend nutrient-dense meals with increased calorie intake for healthy weight gain.';
    } else if (score < 25) {
      status = 'Normal';
      color = '#2E7D32';
      bg = 'rgba(46, 125, 50, 0.15)';
      desc = 'Great range. We recommend balanced meals to maintain stamina, strength, and hydration on your treks.';
    } else if (score < 30) {
      status = 'Over Weight';
      color = '#F57C00';
      bg = 'rgba(245, 124, 0, 0.15)';
      desc = 'We recommend lower-calorie, high-fiber meals with good protein to support gradual fat loss and endurance.';
    } else {
      status = 'Obese';
      color = '#C62828';
      bg = 'rgba(198, 40, 40, 0.15)';
      desc = 'We recommend portion-controlled, high-protein options and consistent activity. Consider medical guidance as needed.';
    }

    if (statusNode) {
      statusNode.textContent = status;
      const pill = statusNode.parentElement;
      if (pill) {
        pill.style.outlineColor = color;
        pill.style.background = bg;
      }
    }
    if (descNode) descNode.innerHTML = desc;

    const scoreRing = scoreNode && scoreNode.parentElement;
    if (scoreRing) {
      scoreRing.style.outlineColor = color;
      scoreRing.style.background = bg;
    }
  };

  const hydrateProductCards = (headingText, products) => {
    const heading = byLeafText(headingText);
    if (!heading || !Array.isArray(products) || products.length === 0) return;

    const section = heading.closest('div[style*="flex-direction: column"]');
    if (!section) return;

    let cards = Array.from(section.querySelectorAll('div[data-property-1="Add-to-bundle"]'));
    if (!cards.length) {
      cards = Array.from(section.querySelectorAll('div[style*="width: 265px"]'))
        .filter((card) => (card.textContent || '').includes('Add to Cart'));
    }
    cards.forEach((card, idx) => {
      const product = products[idx % products.length];
      if (!product) return;
      card.dataset.productSlug = product.slug;

      const textNodes = leafNodes(card);
      const nameNode = textNodes.find((n) => {
        const text = (n.textContent || '').trim();
        return text && !text.startsWith('₹') && !text.endsWith('g') && text !== 'Add to Cart' && text !== 'View Details' && text !== '212' && text !== '4.2';
      });
      const weightNode = textNodes.find((n) => /\d+g$/i.test((n.textContent || '').trim()));
      const priceNode = textNodes.find((n) => /^₹/.test((n.textContent || '').trim()));
      const viewDetailsNode = textNodes.find((n) => (n.textContent || '').trim() === 'View Details');
      const imageNode = card.querySelector('div[style*="background-image"]');

      if (nameNode) nameNode.textContent = product.name;
      if (weightNode) weightNode.textContent = `${product.weight_g}g`;
      if (priceNode) priceNode.textContent = `₹${Number(product.price).toFixed(2)}`;
      const productImages = resolveImageList(product);
      if (imageNode) {
        if (productImages.length) {
          imageNode.style.backgroundImage = `url("${productImages[0]}")`;
          imageNode.style.backgroundSize = 'contain';
          imageNode.style.backgroundRepeat = 'no-repeat';
          imageNode.style.backgroundPosition = 'center';
          imageNode.style.backgroundColor = 'transparent';
        }
      }
      if (viewDetailsNode) {
        viewDetailsNode.dataset.productSlug = product.slug;
        if (viewDetailsNode.parentElement) viewDetailsNode.parentElement.dataset.productSlug = product.slug;
      }
    });
  };

  const hydrateMainBestsellersFromBackend = async () => {
    if (page !== 'main.html') return;

    try {
      const data = await apiRequest('product.php?all=1', { method: 'GET' });
      const products = Array.isArray(data.products) ? data.products : [];
      if (!products.length) return;

      const byRating = [...products].sort((a, b) => Number(b.rating || 0) - Number(a.rating || 0));

      const heroTitle = byLeafText('Fuel Every Step of Your Journey');
      const heroSection = heroTitle && heroTitle.closest('div[style*="height: 800px"]');
      if (heroSection) {
        const heroImages = Array.from(heroSection.querySelectorAll('img'));
        const first = byRating[0] || products[0];
        const second = byRating[1] || products[1] || first;
        const firstImages = resolveImageList(first);
        const secondImages = resolveImageList(second);
        if (heroImages[0] && firstImages[0]) heroImages[0].setAttribute('src', firstImages[0]);
        if (heroImages[1] && secondImages[0]) heroImages[1].setAttribute('src', secondImages[0]);
      }

      const categoriesHeading = byLeafText('Categories');
      const categoriesSection = categoriesHeading && categoriesHeading.parentElement;
      if (categoriesSection) {
        const categoryCards = Array.from(categoriesSection.querySelectorAll('div[data-property-1="E1"], div[data-property-1="R1"], div[data-property-1="T1"]'));
        const tags = Array.from(new Set(byRating.map((p) => String(p.category_tag || '').trim()).filter(Boolean)));

        categoryCards.forEach((card, idx) => {
          const tag = tags[idx] || tags[0];
          if (!tag) return;
          const featuredByTag = byRating.find((p) => String(p.category_tag || '').trim() === tag);
          if (!featuredByTag) return;

          card.dataset.productSlug = featuredByTag.slug;
          card.classList.add('interactive-click');
          if (card.dataset.routeBound !== 'true') {
            card.addEventListener('click', () => {
              window.location.href = `product.html?slug=${encodeURIComponent(featuredByTag.slug)}`;
            });
            card.dataset.routeBound = 'true';
          }
        });
      }

      hydrateProductCards('Discover our bestsellers', products);
    } catch (_err) {
      // Keep static cards if backend call fails.
    }
  };

  const initBackendDataHydration = async () => {
    if (page !== 'product.html' && page !== 'bmi.html') return;

    try {
      const params = new URLSearchParams(window.location.search);
      const slug = params.get('slug') || 'berry-nut-energy-bar';
      const data = await apiRequest(`product.php?slug=${encodeURIComponent(slug)}`, { method: 'GET' });
      const product = data && data.product;
      if (!product) return;

      if (page === 'product.html') {
        setLeafTextByExact('Berry Nut Energy Bar', product.name, 0);
        setLeafTextByContains('A potent, science-backed formula designed', product.description, 0);
        setLeafTextByExact('Weight grams', `${product.weight_g} grams`, 0);
        setLeafTextByContains('Lightweight, Nutritious', product.value_proposition || 'Lightweight, Nutritious', 0);
        setLeafTextByExact('₹70', `₹${Math.round(Number(product.price))}`, 0);
        setLeafTextByExact('₹80', `₹${Math.round(Number(product.mrp || product.price))}`, 0);
        setLeafTextByExact('4.2', String(product.rating), 0);
        setLeafTextByExact('See all 212 reviews', `See all ${product.review_count || 0} reviews`, 0);

        hydrateProductReviews(Array.isArray(data.reviews) ? data.reviews : []);

        hydrateProductGallery(product);
        hydrateProductCards('Similar Products', data.similar || []);
      }

      if (page === 'bmi.html') {
        const suggestions = data.suggestions && data.suggestions.length ? data.suggestions : (data.similar || []);
        const alternatives = data.similar && data.similar.length ? data.similar : suggestions;
        hydrateProductCards('Our Suggestions for you', suggestions);
        hydrateProductCards('You can also try them', alternatives);
      }
    } catch (_err) {
      // Keep static fallback content if backend is unavailable.
    }
  };

  const initProductPageInteractions = () => {
    if (page !== 'product.html') return;

    bindProductThumbInteractions();

    const addButton = document.getElementById('product-add-to-cart');
    const qtyControl = document.getElementById('product-qty-control')
      || document.querySelector('[data-left-icon="true"][data-right-icon="true"]');

    let qty = 1;
    let valueNode = null;
    let left = null;
    let right = null;

    if (qtyControl) {
      left = qtyControl.children[0];
      const center = qtyControl.children[1];
      right = qtyControl.children[2];
      valueNode = center && center.querySelector('div');
      qty = valueNode ? Math.max(1, toNumber(valueNode.textContent, 1)) : 1;

      const render = () => {
        if (valueNode) valueNode.textContent = String(qty);
      };
      render();

      if (left) {
        left.classList.add('interactive-click');
        left.addEventListener('click', () => {
          qty = Math.max(1, qty - 1);
          render();
        });
      }
      if (right) {
        right.classList.add('interactive-click');
        right.addEventListener('click', () => {
          qty = Math.min(99, qty + 1);
          render();
        });
      }
    }

    if (addButton && qtyControl) {
      const showQty = () => {
        addButton.style.display = 'none';
        qtyControl.style.display = 'flex';
        qty = 1;
        if (valueNode) valueNode.textContent = '1';
      };

      // Ensure initial state is Add-to-cart visible.
      addButton.style.display = 'flex';
      qtyControl.style.display = 'none';

      addButton.classList.add('interactive-click');
      addButton.addEventListener('click', (e) => {
        e.preventDefault();
        addCartItem();
        showQty();
      });
    }

    const createInlineQtyControl = () => {
      const qtyControlNode = document.createElement('div');
      qtyControlNode.setAttribute('data-left-icon', 'true');
      qtyControlNode.setAttribute('data-right-icon', 'true');
      qtyControlNode.setAttribute('data-show-text', 'true');
      qtyControlNode.style.alignSelf = 'stretch';
      qtyControlNode.style.height = '44px';
      qtyControlNode.style.overflow = 'hidden';
      qtyControlNode.style.borderRadius = '8px';
      qtyControlNode.style.outline = '1px #415436 solid';
      qtyControlNode.style.outlineOffset = '-1px';
      qtyControlNode.style.justifyContent = 'space-between';
      qtyControlNode.style.alignItems = 'center';
      qtyControlNode.style.display = 'none';

      const leftBtn = document.createElement('div');
      leftBtn.style.flex = '1 1 0';
      leftBtn.style.height = '44px';
      leftBtn.style.background = '#415436';
      leftBtn.style.justifyContent = 'center';
      leftBtn.style.alignItems = 'center';
      leftBtn.style.display = 'flex';
      leftBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M19 13H5V11H19V13Z" fill="white"/></svg>';

      const center = document.createElement('div');
      center.style.width = '72px';
      center.style.justifyContent = 'center';
      center.style.alignItems = 'center';
      center.style.display = 'flex';
      const value = document.createElement('div');
      value.style.textAlign = 'center';
      value.style.color = '#415436';
      value.style.fontSize = '16px';
      value.style.fontFamily = 'Inter';
      value.style.fontWeight = '600';
      value.style.lineHeight = '22.40px';
      value.textContent = '1';
      center.appendChild(value);

      const rightBtn = document.createElement('div');
      rightBtn.style.flex = '1 1 0';
      rightBtn.style.height = '44px';
      rightBtn.style.background = '#415436';
      rightBtn.style.justifyContent = 'center';
      rightBtn.style.alignItems = 'center';
      rightBtn.style.display = 'flex';
      rightBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M19 13H13V19H11V13H5V11H11V5H13V11H19V13Z" fill="white"/></svg>';

      qtyControlNode.appendChild(leftBtn);
      qtyControlNode.appendChild(center);
      qtyControlNode.appendChild(rightBtn);

      return { qtyControlNode, leftBtn, rightBtn, value };
    };

    const similarHeading = byLeafText('Similar Products');
    const similarSection = similarHeading && similarHeading.closest('div[style*="flex-direction: column"]');
    if (similarSection) {
      const cards = Array.from(similarSection.querySelectorAll('div[data-property-1="Add-to-bundle"]'));
      cards.forEach((card) => {
        const addLabel = Array.from(card.querySelectorAll('div'))
          .find((n) => n.childElementCount === 0 && (n.textContent || '').trim() === 'Add to Cart');
        if (!addLabel || addLabel.dataset.qtyEnhanced === 'true') return;

        const addButtonWrap = addLabel.parentElement;
        if (!addButtonWrap || !addButtonWrap.parentElement) return;

        addLabel.dataset.qtyEnhanced = 'true';
        addButtonWrap.classList.add('interactive-click');

        const { qtyControlNode, leftBtn, rightBtn, value } = createInlineQtyControl();
        addButtonWrap.parentElement.insertBefore(qtyControlNode, addButtonWrap.nextSibling);

        let cardQty = 1;
        const renderCardQty = () => {
          value.textContent = String(cardQty);
        };

        const showCardQty = () => {
          addButtonWrap.style.display = 'none';
          qtyControlNode.style.display = 'flex';
          cardQty = 1;
          renderCardQty();
        };

        leftBtn.classList.add('interactive-click');
        leftBtn.addEventListener('click', () => {
          cardQty = Math.max(1, cardQty - 1);
          renderCardQty();
        });

        rightBtn.classList.add('interactive-click');
        rightBtn.addEventListener('click', () => {
          cardQty = Math.min(99, cardQty + 1);
          renderCardQty();
        });

        // Text click already has global Add-to-cart action bound; just swap UI.
        addLabel.addEventListener('click', () => {
          showCardQty();
        });

        // Clicking button area outside the text should still add item and swap UI.
        addButtonWrap.addEventListener('click', (e) => {
          if (e.target === addLabel || addLabel.contains(e.target)) return;
          addCartItem();
          showCardQty();
        });
      });
    }

    const reviewsHeading = byLeafText('Reviews & Testimonials');
    const writeReview = byLeafText('Write a review');
    const loadMore = byLeafText('Load more reviews');
    const seeAll = leafNodes(document).find((n) => (n.textContent || '').includes('See all') && (n.textContent || '').includes('reviews'));
    const productSlug = new URLSearchParams(window.location.search).get('slug') || 'berry-nut-energy-bar';

    let currentProductPromise = null;
    let reviewFormWrap = null;

    const getCurrentProductData = async () => {
      if (!currentProductPromise) {
        currentProductPromise = apiRequest(`product.php?slug=${encodeURIComponent(productSlug)}`, { method: 'GET' })
          .then((data) => (data && data.product ? data.product : null));
      }
      return currentProductPromise;
    };

    const refreshReviewsFromBackend = async () => {
      const data = await apiRequest(`product.php?slug=${encodeURIComponent(productSlug)}`, { method: 'GET' });
      const reviews = Array.isArray(data && data.reviews) ? data.reviews : [];
      hydrateProductReviews(reviews);

      const countText = `See all ${reviews.length} reviews`;
      setLeafTextByContains('See all', countText, 0);
    };

    const buildReviewForm = () => {
      const wrapper = document.createElement('div');
      wrapper.style.alignSelf = 'stretch';
      wrapper.style.display = 'flex';
      wrapper.style.flexDirection = 'column';
      wrapper.style.gap = '10px';
      wrapper.style.padding = '14px';
      wrapper.style.background = '#F8F8F8';
      wrapper.style.border = '1px solid #EAEAEA';
      wrapper.style.borderRadius = '8px';

      const title = document.createElement('div');
      title.textContent = 'Share your review';
      title.style.color = '#212121';
      title.style.fontFamily = 'Inter';
      title.style.fontSize = '15px';
      title.style.fontWeight = '600';

      const nameInput = document.createElement('input');
      nameInput.type = 'text';
      nameInput.placeholder = 'Your name';
      nameInput.maxLength = 120;
      nameInput.style.width = '100%';
      nameInput.style.padding = '10px 12px';
      nameInput.style.border = '1px solid #D9D9D9';
      nameInput.style.borderRadius = '6px';
      nameInput.style.fontSize = '14px';
      nameInput.style.fontFamily = 'Inter';

      const ratingSelect = document.createElement('select');
      ratingSelect.style.width = '100%';
      ratingSelect.style.padding = '10px 12px';
      ratingSelect.style.border = '1px solid #D9D9D9';
      ratingSelect.style.borderRadius = '6px';
      ratingSelect.style.fontSize = '14px';
      ratingSelect.style.fontFamily = 'Inter';
      [5, 4, 3, 2, 1].forEach((value) => {
        const opt = document.createElement('option');
        opt.value = String(value);
        opt.textContent = `${value} star${value > 1 ? 's' : ''}`;
        ratingSelect.appendChild(opt);
      });

      const reviewInput = document.createElement('textarea');
      reviewInput.placeholder = 'Write your review';
      reviewInput.maxLength = 1200;
      reviewInput.style.width = '100%';
      reviewInput.style.minHeight = '96px';
      reviewInput.style.padding = '10px 12px';
      reviewInput.style.border = '1px solid #D9D9D9';
      reviewInput.style.borderRadius = '6px';
      reviewInput.style.fontSize = '14px';
      reviewInput.style.fontFamily = 'Inter';
      reviewInput.style.resize = 'vertical';

      const actions = document.createElement('div');
      actions.style.display = 'flex';
      actions.style.gap = '8px';
      actions.style.flexWrap = 'wrap';

      const submitBtn = document.createElement('button');
      submitBtn.type = 'button';
      submitBtn.textContent = 'Submit review';
      submitBtn.style.padding = '10px 16px';
      submitBtn.style.background = '#546D46';
      submitBtn.style.color = '#fff';
      submitBtn.style.border = '0';
      submitBtn.style.borderRadius = '6px';
      submitBtn.style.fontSize = '14px';
      submitBtn.style.fontFamily = 'Inter';
      submitBtn.style.fontWeight = '600';
      submitBtn.classList.add('interactive-click');

      const cancelBtn = document.createElement('button');
      cancelBtn.type = 'button';
      cancelBtn.textContent = 'Cancel';
      cancelBtn.style.padding = '10px 14px';
      cancelBtn.style.background = '#F0F0F0';
      cancelBtn.style.color = '#212121';
      cancelBtn.style.border = '1px solid #DADADA';
      cancelBtn.style.borderRadius = '6px';
      cancelBtn.style.fontSize = '14px';
      cancelBtn.style.fontFamily = 'Inter';
      cancelBtn.classList.add('interactive-click');

      const status = document.createElement('div');
      status.style.fontSize = '13px';
      status.style.fontFamily = 'Inter';
      status.style.minHeight = '16px';

      const setStatus = (message, isError = false) => {
        status.textContent = message;
        status.style.color = isError ? '#B42318' : '#027A48';
      };

      submitBtn.addEventListener('click', async () => {
        const userName = String(nameInput.value || '').trim();
        const reviewText = String(reviewInput.value || '').trim();
        const rating = Number(ratingSelect.value || '5');

        if (!userName) {
          setStatus('Please enter your name.', true);
          return;
        }
        if (!reviewText) {
          setStatus('Please write your review.', true);
          return;
        }

        try {
          submitBtn.disabled = true;
          submitBtn.style.opacity = '0.7';
          setStatus('Submitting review...');

          const product = await getCurrentProductData();
          if (!product || !product.id) {
            throw new Error('Product details not found');
          }

          await apiRequest('admin/reviews.php', {
            method: 'POST',
            body: JSON.stringify({
              product_id: Number(product.id),
              user_name: userName,
              review_text: reviewText,
              rating,
            })
          });

          await refreshReviewsFromBackend();
          setStatus('Thanks! Your review was submitted.');
          showToast('Review submitted successfully');

          nameInput.value = '';
          reviewInput.value = '';
          ratingSelect.value = '5';

          setTimeout(() => {
            if (wrapper.parentElement) {
              wrapper.parentElement.removeChild(wrapper);
            }
            reviewFormWrap = null;
          }, 900);
        } catch (err) {
          setStatus(err instanceof Error ? err.message : 'Failed to submit review', true);
        } finally {
          submitBtn.disabled = false;
          submitBtn.style.opacity = '1';
        }
      });

      cancelBtn.addEventListener('click', () => {
        if (wrapper.parentElement) {
          wrapper.parentElement.removeChild(wrapper);
        }
        reviewFormWrap = null;
      });

      actions.appendChild(submitBtn);
      actions.appendChild(cancelBtn);
      wrapper.appendChild(title);
      wrapper.appendChild(nameInput);
      wrapper.appendChild(ratingSelect);
      wrapper.appendChild(reviewInput);
      wrapper.appendChild(actions);
      wrapper.appendChild(status);

      return wrapper;
    };

    if (loadMore && loadMore.parentElement) {
      loadMore.parentElement.style.display = 'none';
    }

    if (writeReview) {
      writeReview.classList.add('interactive-click');
      writeReview.addEventListener('click', () => {
        if (!reviewsHeading) return;

        if (reviewFormWrap && reviewFormWrap.parentElement) {
          reviewFormWrap.scrollIntoView({ behavior: 'smooth', block: 'center' });
          return;
        }

        const reviewsSection = reviewsHeading.closest('div[style*="flex-direction: column"][style*="gap: 16px"]');
        const headerRow = reviewsHeading.parentElement;
        if (!reviewsSection || !headerRow) return;

        reviewFormWrap = buildReviewForm();
        reviewsSection.insertBefore(reviewFormWrap, headerRow.nextSibling);
        reviewFormWrap.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    }

    if (seeAll && reviewsHeading) {
      seeAll.classList.add('interactive-click');
      seeAll.addEventListener('click', () => {
        reviewsHeading.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
  };

  const initWishlistToggle = () => {
    const hearts = Array.from(document.querySelectorAll('#app div[data-svg-wrapper][data-property-1="False"]'))
      .filter((el) => el.querySelector('path[d*="M12 21.0004"]'));

    hearts.forEach((heart, idx) => {
      const clickable = heart.parentElement;
      const path = heart.querySelector('path[d*="M12 21.0004"]');
      if (!clickable || !path) return;

      // Keep wishlist button pinned to top-right of card image on all screen sizes.
      clickable.style.left = 'auto';
      clickable.style.right = '8px';
      clickable.style.top = '8px';

      const key = `nomad_wishlist_${idx}`;
      const inactivePath = path.getAttribute('d') || '';
      const activePath = 'M12 21.1752L10.55 19.8552C5.4 15.1852 2 12.1052 2 8.3252C2 5.2452 4.42 2.8252 7.5 2.8252C9.24 2.8252 10.91 3.6352 12 4.9152C13.09 3.6352 14.76 2.8252 16.5 2.8252C19.58 2.8252 22 5.2452 22 8.3252C22 12.1052 18.6 15.1852 13.45 19.8652L12 21.1752Z';

      const apply = (active) => {
        path.setAttribute('d', active ? activePath : inactivePath);
        path.setAttribute('fill', active ? '#C62828' : '#757575');
        path.setAttribute('stroke', 'none');
      };

      const saved = localStorage.getItem(key) === '1';
      apply(saved);
      clickable.classList.add('interactive-click');
      clickable.addEventListener('click', () => {
        const now = localStorage.getItem(key) !== '1';
        apply(now);
        localStorage.setItem(key, now ? '1' : '0');
      });
    });
  };

  const initReusableAnimations = () => {
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const markEnter = (elements, startDelay = 0) => {
      Array.from(elements || []).forEach((el, idx) => {
        if (!el || el.dataset.nsAnimBound === 'true') return;
        el.classList.add('ns-anim-enter');

        const delayClass = `ns-anim-delay-${Math.min(5, Math.max(1, startDelay + idx))}`;
        el.classList.add(delayClass);
        el.dataset.nsAnimBound = 'true';
      });
    };

    const rootBlocks = Array.from(document.querySelectorAll('#app > div')).filter((el) => el.id !== 'site-nav');
    let pageSections = [];

    rootBlocks.forEach((root) => {
      const children = Array.from(root.children || []).filter((el) => el && el.nodeType === 1);
      if (children.length > 1) {
        pageSections.push(...children);
      } else {
        pageSections.push(root);
      }
    });

    pageSections = pageSections.filter((el) => {
      const rect = el.getBoundingClientRect();
      return rect.height > 120;
    });

    markEnter(pageSections, 1);

    const visualCards = Array.from(document.querySelectorAll(
      '#app div[data-property-1="Add-to-bundle"], '
      + '#app div[data-property-1="E1"], '
      + '#app div[data-property-1="R1"], '
      + '#app div[data-property-1="T1"], '
      + '#app div[data-property-1="False"][style*="padding: 24px"][style*="border-radius: 12px"]'
    ));
    visualCards.forEach((card) => card.classList.add('ns-anim-card'));

    const floatMedia = Array.from(document.querySelectorAll(
      '#app img[style*="height: 580px"], '
      + '#app div[data-property-1="Add-to-bundle"] div[style*="background-image"], '
      + '#app div[style*="width: 674px"][style*="position: relative"] img'
    ));
    floatMedia.forEach((el, idx) => {
      if (idx < 4) el.classList.add('ns-anim-float');
    });

    const enterNodes = Array.from(document.querySelectorAll('.ns-anim-enter'));
    if (!enterNodes.length) return;

    // Reveal all animated sections right away so content never appears missing
    // before the user scrolls.
    requestAnimationFrame(() => {
      enterNodes.forEach((el) => el.classList.add('ns-visible'));
    });
  };

  const applyAllResponsiveFixes = () => {
    applyResponsiveWrap();
    applyResponsiveAbsoluteImages();
  };

  window.addEventListener('load', () => {
    initMobileNav();
    initCrossPageLinks();
    initCTAButtons();
    initMainBmiWidget();
    initFAQAccordion();
    hydrateMainBestsellersFromBackend();
    initBackendDataHydration();
    initBMIResultHydration();
    initProductPageInteractions();
    initWishlistToggle();
    initReusableAnimations();
    applyAllResponsiveFixes();
  });

  document.addEventListener('DOMContentLoaded', () => {
    initReusableAnimations();
  });

  window.addEventListener('resize', () => {
    clearTimeout(window.__wrapResizeTimer);
    window.__wrapResizeTimer = setTimeout(applyAllResponsiveFixes, 100);
  });
})();
