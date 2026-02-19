(function () {
  const pxFromStyle = (styleText, prop) => {
    if (!styleText) return null;
    const re = new RegExp(`${prop}\\s*:\\s*([0-9.]+)px`, 'i');
    const m = styleText.match(re);
    return m ? parseFloat(m[1]) : null;
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

  const applyAllResponsiveFixes = () => {
    applyResponsiveWrap();
    applyResponsiveAbsoluteImages();
  };

  window.addEventListener('load', () => {
    initMobileNav();
    applyAllResponsiveFixes();
  });

  window.addEventListener('resize', () => {
    clearTimeout(window.__wrapResizeTimer);
    window.__wrapResizeTimer = setTimeout(applyAllResponsiveFixes, 100);
  });
})();
