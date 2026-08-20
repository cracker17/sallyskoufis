/*
 * custom.js - all of the store's bespoke behaviour.
 *
 * Previously this lived as ~14 separate inline <script> blocks in layout/theme.liquid, several of
 * them after </body> and inside </html>. Three of them threw on every page load, which aborted the
 * rest of that block. Consolidated here, null-guarded, and loaded with `defer` so it never blocks
 * rendering. Liquid-dependent values arrive on window.themeCustom (set in theme.liquid).
 */
(function () {
  'use strict';

  var config = window.themeCustom || {};

  function ready(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn, { once: true });
    } else {
      fn();
    }
  }

  /* Coalesce scroll work into one rAF callback instead of running it on every scroll event. */
  function onScrollFrame(fn) {
    var ticking = false;
    window.addEventListener('scroll', function () {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(function () {
        ticking = false;
        fn();
      });
    }, { passive: true });
    fn();
  }

  /* ---------------------------------------------------------------------------------------------
   * Timesact pre-order description
   * ------------------------------------------------------------------------------------------- */
  function timesact() {
    var leadTime = (config.bespokeLeadTime || '').trim();
    var allowBackorder = (config.allowBackorder || '').toLowerCase().trim();

    if (leadTime !== '' && allowBackorder === 'true') return;

    function hide() {
      var target = document.querySelector('.timesact-preorder-description');
      if (!target) return;
      target.style.setProperty('display', 'none', 'important');
      target.style.setProperty('margin-bottom', '-20px', 'important');
    }

    hide();

    /* The app injects its markup late, so keep watching for it. */
    var observer = new MutationObserver(function () {
      if (document.querySelector('.timesact-preorder-description')) hide();
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  /* ---------------------------------------------------------------------------------------------
   * Header highlight past the fold (homepage only)
   * ------------------------------------------------------------------------------------------- */
  function headerHighlight() {
    var header = document.querySelector('.homepage header');
    if (!header) return; /* was an unguarded .offsetHeight - threw on every non-homepage page */

    var headerHeight = header.offsetHeight;
    var threshold = window.innerHeight + headerHeight;

    onScrollFrame(function () {
      header.classList.toggle('highlight', (window.scrollY || window.pageYOffset) >= threshold);
    });
  }

  /* ---------------------------------------------------------------------------------------------
   * Hero video / logo crossfade past the fold (homepage only)
   * ------------------------------------------------------------------------------------------- */
  function heroCrossfade() {
    var video = document.querySelector('.homepage .shopify-section--video');
    var logoIcon = document.querySelector('.homepage .header__logo-image');
    var logoText = document.querySelector('.homepage .header__logo-image.header__logo-image--transparent');

    if (!video && !logoIcon && !logoText) return;

    onScrollFrame(function () {
      var past = window.scrollY > window.innerHeight;

      if (video) {
        video.style.zIndex = past ? 0 : 2;
        video.style.opacity = past ? 0 : 1;
      }
      if (logoIcon) logoIcon.style.opacity = past ? 1 : 0;
      if (logoText) logoText.style.opacity = past ? 0 : 1;
    });
  }

  /* ---------------------------------------------------------------------------------------------
   * Fixed-footer reveal: main needs bottom room equal to the footer's height.
   * Was set on window 'load', which guaranteed a late layout shift. Now published as a CSS
   * custom property as soon as the footer exists, and kept in sync on resize.
   * ------------------------------------------------------------------------------------------- */
  function footerReveal() {
    var footer = document.querySelector('footer');
    if (!footer) return;

    function publish() {
      document.documentElement.style.setProperty(
        '--reveal-footer-height', Math.max(footer.offsetHeight - 30, 0) + 'px'
      );
    }

    publish();

    if (typeof ResizeObserver === 'function') {
      new ResizeObserver(publish).observe(footer);
    } else {
      window.addEventListener('resize', publish, { passive: true });
    }
  }

  /* ---------------------------------------------------------------------------------------------
   * Colour swatch hover label (product pages)
   * ------------------------------------------------------------------------------------------- */
  function colourSwatches() {
    var outer = document.querySelector('.color-picker-outer');
    var label = document.querySelector('.color-value-selected');
    if (!outer || !label) return; /* this pair threw a TypeError on every non-product page */

    var timer;
    function show(text) {
      if (text == null) return;
      label.textContent = text;
      label.classList.add('animate');
      clearTimeout(timer);
      timer = setTimeout(function () { label.classList.remove('animate'); }, 500);
    }

    document.querySelectorAll('.color-swatch').forEach(function (swatch) {
      swatch.addEventListener('mouseover', function () {
        var span = swatch.querySelector('span');
        if (span) show(span.textContent);
      });
    });

    outer.addEventListener('mouseout', function () {
      var checked = outer.querySelector('label.color-swatch');
      var span = checked && checked.querySelector('span');
      if (span) show(span.textContent);
    });
  }

  /* ---------------------------------------------------------------------------------------------
   * FAQ multi-column accordions
   * ------------------------------------------------------------------------------------------- */
  function faqColumns() {
    document.querySelectorAll('.faq-multi-col-heading').forEach(function (heading) {
      heading.addEventListener('click', function () {
        var next = heading.nextElementSibling;
        heading.classList.toggle('faq-title-active');
        if (next) next.classList.toggle('faq-active-text');
      });
    });
  }

  /* ---------------------------------------------------------------------------------------------
   * Hero video autoplay nudge
   * ------------------------------------------------------------------------------------------- */
  function heroAutoplay() {
    var id = window.innerWidth > 749 ? 'hero-video' : 'hero-video-mobile';
    var el = document.getElementById(id);
    if (el) el.click();
  }

  /* ---------------------------------------------------------------------------------------------
   * Announcement bar slider (tiny-slider)
   * ------------------------------------------------------------------------------------------- */
  function topbarSlider() {
    var sliders = document.querySelectorAll('.topbar-slider');
    if (!sliders.length || typeof window.tns !== 'function') return;

    sliders.forEach(function (slider) {
      window.tns({
        container: slider,
        items: 1,
        autoplay: true,
        speed: 2000,
        autoplayTimeout: 4000,
        autoplayButtonOutput: false,
        loop: true
      });
    });
  }

  /* ---------------------------------------------------------------------------------------------
   * Klaviyo "Added to Cart"
   * ------------------------------------------------------------------------------------------- */
  function klaviyoAddToCart() {
    if (!config.productTitle) return;

    window._learnq = window._learnq || [];

    document.querySelectorAll('.button.w-full').forEach(function (button) {
      button.addEventListener('click', function () {
        /* The original passed an undefined `item`, so this call always threw. */
        window._learnq.push(['track', 'Added to Cart', {
          Name: config.productTitle,
          ProductID: config.productId,
          URL: config.productUrl
        }]);
      });
    });
  }

  /* ---------------------------------------------------------------------------------------------
   * jQuery-dependent behaviour: variant hover previews, parallax, load-more, material toggle.
   * ------------------------------------------------------------------------------------------- */
  function jqueryBehaviour() {
    var $ = window.jQuery;
    if (!$) return;

    /* Variant swatch hover swaps the card image. */
    function bindVariantHover() {
      $('.product-list, .prod-coll-slider')
        .on('mouseenter', '[class^="triangle_variant_"]', function () {
          var variant = $(this).attr('class').split(' ')[0].replace('triangle_variant_', '');
          $(this).closest('.product-card').find('.image_prod_cstm_' + variant).addClass('shown');
        })
        .on('mouseleave', '[class^="triangle_variant_"]', function () {
          var variant = $(this).attr('class').split(' ')[0].replace('triangle_variant_', '');
          $(this).closest('.product-card').find('.image_prod_cstm_' + variant).removeClass('shown');
        });
    }

    /* Product pages build their sliders late, so the original waited 2s before binding. */
    if (config.pageType === 'product') {
      setTimeout(bindVariantHover, 2000);
    } else {
      bindVariantHover();
    }

    /* Horizontal parallax. */
    if (typeof $.fn.paroller === 'function') {
      $('.richtext-hero').paroller({
        factor: 0.3, factorXs: 0.2, factorSm: 0.3,
        type: 'foreground', direction: 'horizontal', transition: 'transform 1s ease'
      });
      $('.black-section-home').paroller({
        factor: 0.4, factorXs: 0.2, factorSm: 0.3,
        type: 'foreground', direction: 'horizontal', transition: 'transform 1s ease'
      });
    }

    /* Base material accordion. */
    $('.Base-Material-btn').on('click', function () {
      $('.Base-Material-options').toggle();
      $(this).find('svg').toggleClass('svg-rotate');
    });

    /* Collection "load more" pagination. */
    var $loadMoreBtn = $('.load-more_btn');
    var $loadMoreSpinner = $('.load-more_spinner');
    var $currentPage = $('[data-current-page]');
    var $totalPages = $('[data-total-pages]');

    if (!$currentPage.length || !$totalPages.length) return;

    if (parseInt($totalPages.val(), 10) === parseInt($currentPage.val(), 10)) {
      $loadMoreBtn.hide();
    }

    $('.js-load-more').on('click', function () {
      var $this = $(this);
      var totalPages = parseInt($totalPages.val(), 10);
      var currentPage = parseInt($currentPage.val(), 10) + 1;
      var $nextUrl = $('[data-next-url]');

      if (!$nextUrl.length) return;

      $this.attr('disabled', true);
      $this.find('[loader]').removeClass('hide');
      $currentPage.val(currentPage);

      $.ajax({
        url: $nextUrl.val().replace(/page=[0-9]+/, 'page=' + currentPage),
        type: 'GET',
        dataType: 'html',
        beforeSend: function () {
          $loadMoreBtn.hide();
          $loadMoreSpinner.show();
        },
        success: function (responseHTML) {
          $('.product-list').append($(responseHTML).find('.product-list').html());
        },
        complete: function () {
          if (currentPage < totalPages) {
            $this.attr('disabled', false);
            $this.find('[load-more-text]').removeClass('hide');
            $this.find('[loader]').addClass('hide');
            $loadMoreBtn.show();
          } else {
            $loadMoreBtn.hide();
          }
          $loadMoreSpinner.hide();
        }
      });
    });
  }

  /* AOS ships its own DOM-ready handling; init it here so it runs at the same point in the
     lifecycle it did when it was an inline script. */
  function initAos() {
    if (window.AOS) window.AOS.init();
  }

  /* ---------------------------------------------------------------------------------------------
   * tiny-slider accessibility
   *
   * tiny-slider builds its own controls, and two of its choices fail an audit:
   *   - the controls wrapper gets aria-label + tabindex="0" but no role, so the aria-label is not
   *     a permitted attribute on that element
   *   - the prev/next buttons contain only an arrow image, which is decorative, so the buttons end
   *     up with no accessible name at all
   * Both are patched here rather than in the six call sites, and re-applied for sliders that are
   * built later (product page, quick views).
   * ------------------------------------------------------------------------------------------- */
  function fixSliderA11y(root) {
    var scope = root && root.querySelectorAll ? root : document;

    scope.querySelectorAll('.tns-controls').forEach(function (controls) {
      if (!controls.getAttribute('role')) controls.setAttribute('role', 'group');

      controls.querySelectorAll('button').forEach(function (button) {
        var named = button.getAttribute('aria-label') || button.textContent.trim();
        if (named) return;

        /* The theme already exposes localised strings on window.themeVariables. */
        var strings = (window.themeVariables && window.themeVariables.strings) || {};
        var direction = button.getAttribute('data-controls');
        button.setAttribute('aria-label', direction === 'prev'
          ? (strings.previous || 'Previous')
          : (strings.next || 'Next'));
      });
    });

    scope.querySelectorAll('.tns-nav button').forEach(function (button, index) {
      if (!button.getAttribute('aria-label') && !button.textContent.trim()) {
        button.setAttribute('aria-label', 'Go to slide ' + (index + 1));
      }
    });
  }

  function watchForLateSliders() {
    if (typeof MutationObserver !== 'function') return;

    var pending = false;
    new MutationObserver(function () {
      if (pending) return;
      pending = true;
      window.requestAnimationFrame(function () {
        pending = false;
        fixSliderA11y(document);
      });
    }).observe(document.body, { childList: true, subtree: true });
  }

  ready(function () {
    initAos();
    fixSliderA11y(document);
    watchForLateSliders();
    timesact();
    headerHighlight();
    heroCrossfade();
    footerReveal();
    colourSwatches();
    faqColumns();
    heroAutoplay();
    topbarSlider();
    klaviyoAddToCart();
    jqueryBehaviour();
  });
})();
