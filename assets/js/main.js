(function () {
  const page = (window.location.pathname.split('/').pop() || '').toLowerCase();

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
      ['Recalculate BMI', 'main.html'],
      ['View Details', 'product.html']
    ]);

    const nodes = document.querySelectorAll('#app div, #app span');
    nodes.forEach((el) => {
      if (el.childElementCount > 0) return;
      if (el.closest('a')) return;

      const label = (el.textContent || '').trim();
      const href = textRoutes.get(label);
      if (!href) return;

      el.style.cursor = 'pointer';
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
      }

      if (label === 'Add to Cart' && el.dataset.actionBound !== 'true') {
        el.addEventListener('click', (e) => {
          e.preventDefault();
          addCartItem();
        });
        el.dataset.actionBound = 'true';
      }

      if (label === 'View Details' && el.dataset.actionBound !== 'true') {
        el.addEventListener('click', () => {
          window.location.href = 'product.html';
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
    calcLink.addEventListener('click', (e) => {
      e.preventDefault();
      const age = toNumber(ageNode.textContent, 23);
      const heightCm = toNumber(heightNode.textContent, 159);
      const weightKg = toNumber(weightNode.textContent, 55);
      const bmi = weightKg / Math.pow(heightCm / 100, 2);
      const rounded = Math.round(bmi * 10) / 10;

      localStorage.setItem('nomad_last_bmi', String(rounded));
      localStorage.setItem('nomad_last_age', String(age));
      localStorage.setItem('nomad_last_height', String(heightCm));
      localStorage.setItem('nomad_last_weight', String(weightKg));

      window.location.href = `BMI.html?bmi=${encodeURIComponent(String(rounded))}`;
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

  const initProductPageInteractions = () => {
    if (page !== 'product.html') return;

    const qtyControl = document.querySelector('[data-left-icon="true"][data-right-icon="true"]');
    if (qtyControl) {
      const left = qtyControl.children[0];
      const center = qtyControl.children[1];
      const right = qtyControl.children[2];
      const valueNode = center && center.querySelector('div');
      let qty = valueNode ? Math.max(1, toNumber(valueNode.textContent, 3)) : 3;

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

    const reviewsHeading = byLeafText('Reviews & Testimonials');
    const writeReview = byLeafText('Write a review');
    const loadMore = byLeafText('Load more reviews');
    const seeAll = byLeafText('See all 212 reviews');

    const reviewSeeds = [
      { name: 'Arjun P.', when: '4 days ago', text: 'Great taste and easy to carry. Perfect for long treks.' },
      { name: 'Nisha K.', when: '1 week ago', text: 'Loved the ingredients and energy boost. Will order again.' }
    ];
    let loaded = 0;

    const createReviewCard = (seed) => {
      const card = document.createElement('div');
      card.style.alignSelf = 'stretch';
      card.style.paddingBottom = '16px';
      card.style.borderBottom = '1px #F5F5F5 solid';
      card.style.display = 'flex';
      card.style.flexDirection = 'column';
      card.style.gap = '8px';
      card.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:flex-start"><div style="font-size:16px;font-weight:500;color:black">${seed.name}</div><div style="font-size:11px;color:#757575">${seed.when}</div></div><div style="font-size:16px;color:#616161;line-height:22.4px">\"${seed.text}\"</div>`;
      return card;
    };

    const loadIntoList = () => {
      if (!loadMore || loaded >= reviewSeeds.length) return;
      const list = loadMore.closest('div[style*="flex-direction: column"]');
      if (!list) return;
      list.insertBefore(createReviewCard(reviewSeeds[loaded]), loadMore.parentElement);
      loaded += 1;
      if (loaded >= reviewSeeds.length) {
        loadMore.textContent = 'No more reviews';
        loadMore.style.opacity = '0.6';
      }
    };

    if (loadMore) {
      loadMore.classList.add('interactive-click');
      loadMore.addEventListener('click', loadIntoList);
    }

    if (writeReview) {
      writeReview.classList.add('interactive-click');
      writeReview.addEventListener('click', () => {
        const text = window.prompt('Write your review:');
        if (!text) return;
        const list = loadMore && loadMore.closest('div[style*="flex-direction: column"]');
        if (!list) return;
        list.insertBefore(createReviewCard({ name: 'You', when: 'just now', text }), loadMore.parentElement);
        showToast('Review submitted');
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
      const key = `nomad_wishlist_${idx}`;
      const apply = (active) => {
        path.setAttribute('fill', active ? '#C62828' : '#757575');
      };

      const saved = localStorage.getItem(key) === '1';
      apply(saved);
      clickable.classList.add('interactive-click');
      clickable.addEventListener('click', () => {
        const now = path.getAttribute('fill') !== '#C62828';
        apply(now);
        localStorage.setItem(key, now ? '1' : '0');
      });
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
    initBMIResultHydration();
    initProductPageInteractions();
    initWishlistToggle();
    applyAllResponsiveFixes();
  });

  window.addEventListener('resize', () => {
    clearTimeout(window.__wrapResizeTimer);
    window.__wrapResizeTimer = setTimeout(applyAllResponsiveFixes, 100);
  });
})();
