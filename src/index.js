import PreviewComponent from './lib/preview.vue';
import PhotoSwipe from 'photoswipe/dist/photoswipe';
import PhotoSwipeUIDefault from 'photoswipe/dist/photoswipe-ui-default';
import './assert/style/style.css';


const VuePicture = {
  install(Vue, options) {
    Vue.component('VuePicture', {
      mixins: [ PreviewComponent ],
      props: {
        slides: Array,
      },
      methods: {
        initPhotoSwipeFromDOM(gallerySelector) {
          const self = this;
          const galleryElements = document.querySelectorAll(gallerySelector);
          for (let i = 0, l = galleryElements.length; i < l; i++) {
            galleryElements[ i ].setAttribute('data-pswp-uid', i + 1);
          }
          const hashData = this.photoSwipeParseHash();
          if (hashData.pid && hashData.gid) {
            this.openPhotoSwipe(hashData.pid, galleryElements[ hashData.gid - 1 ], true, true);
          }
        },

        parseThumbnailElements(el) {
          const thumbElements = el.childNodes;
          const numNodes = thumbElements.length;
          const items = [];
          let figureEl;
          let linkEl;
          let size;
          let item;
          for (let i = 0; i < numNodes; i++) {
            figureEl = thumbElements[ i ]; // <figure> element
            // include only element nodes
            if (figureEl.nodeType !== 1) {
              continue;
            }
            linkEl = figureEl.children[ 0 ]; // <a> element
            size = linkEl.getAttribute('data-size').split('x');
            // create slide object
            item = {
              src: linkEl.getAttribute('href'),
              w: parseInt(size[ 0 ], 10),
              h: parseInt(size[ 1 ], 10),
            };
            if (figureEl.children.length > 1) {
              // <figcaption> content
              item.title = figureEl.children[ 1 ].innerHTML;
            }
            if (linkEl.children.length > 0) {
              // <img> thumbnail element, retrieving thumbnail url
              item.msrc = linkEl.children[ 0 ].getAttribute('src');
            }
            item.el = figureEl; // save link to element for getThumbBoundsFn
            items.push(item);
          }
          return items;
        },
        openPhotoSwipe(index, galleryElement, disableAnimation, fromURL) {
          const pswpElement = document.querySelectorAll('.pswp')[ 0 ];
          const items = this.parseThumbnailElements(galleryElement);
          const photoSwipeOptions = Object.assign({
            galleryUID: galleryElement.getAttribute('data-pswp-uid'),
            getThumbBoundsFn(index) {
              if (!items.length) {
                return { x: 0, y: 0, w: 0 };
              }
              const thumbnail = items[ index ].el.getElementsByTagName('img')[ 0 ]; // find thumbnail
              const pageYScroll = window.pageYOffset || document.documentElement.scrollTop;
              const rect = thumbnail.getBoundingClientRect();
              return { x: rect.left, y: rect.top + pageYScroll, w: rect.width };
            },
          }, options);

          // PhotoSwipe opened from URL
          if (fromURL) {
            if (photoSwipeOptions.galleryPIDs) {
              // parse real index when custom PIDs are used
              // http://photoswipe.com/documentation/faq.html#custom-pid-in-url
              for (let j = 0; j < items.length; j++) {
                if (items[ j ].pid === index) {
                  photoSwipeOptions.index = j;
                  break;
                }
              }
            } else {
              // in URL indexes start from 1
              photoSwipeOptions.index = parseInt(index, 10) - 1;
            }
          } else {
            photoSwipeOptions.index = parseInt(index, 10);
          }
          // exit if index not found
          if (isNaN(photoSwipeOptions.index)) {
            return;
          }
          if (disableAnimation) {
            photoSwipeOptions.showAnimationDuration = 0;
          }
          // Pass data to PhotoSwipe and initialize it
          const gallery = new PhotoSwipe(pswpElement, PhotoSwipeUIDefault, items, photoSwipeOptions);
          gallery.init();
          // Gallery starts closing
          gallery.listen('close', () => {
            window.deg = 0;
            this.$emit('close');
          });
        },
        closest(el, fn) {
          return el && (fn(el) ? el : this.closest(el.parentNode, fn));
        },
        onThumbnailsClick(e) {
          e = window.event;
          e.preventDefault ? e.preventDefault() : e.returnValue = false;
          const eTarget = e.target || e.srcElement;
          // find root element of slide
          const clickedListItem = this.closest(eTarget, function (el) {
            return (el.tagName && el.tagName.toUpperCase() === 'FIGURE');
          });
          if (!clickedListItem) {
            return;
          }
          // find index of clicked item by looping through all child nodes
          // alternatively, you may define index via data- attribute
          const clickedGallery = clickedListItem.parentNode;
          const childNodes = clickedListItem.parentNode.childNodes;
          const numChildNodes = childNodes.length;
          let nodeIndex = 0;
          let index;
          for (let i = 0; i < numChildNodes; i++) {
            if (childNodes[ i ].nodeType !== 1) {
              continue;
            }
            if (childNodes[ i ] === clickedListItem) {
              index = nodeIndex;
              break;
            }
            nodeIndex++;
          }
          if (index >= 0) {
            // open PhotoSwipe if valid index found
            this.openPhotoSwipe(index, clickedGallery);
          }
          return false;
        },
        photoSwipeParseHash() {
          const hash = window.location.hash.substring(1);
          const params = {};
          if (hash.length < 5) {
            return params;
          }
          const vars = hash.split('&');
          for (let i = 0; i < vars.length; i++) {
            if (!vars[ i ]) {
              continue;
            }
            const pair = vars[ i ].split('=');
            if (pair.length < 2) {
              continue;
            }
            params[ pair[ 0 ] ] = pair[ 1 ];
          }
          if (params.gid) {
            params.gid = parseInt(params.gid, 10);
          }
          return params;
        },

      },
      mounted() {
        this.initPhotoSwipeFromDOM('.my-gallery');
      },
    });
  },
};
if (typeof window !== 'undefined' && window.Vue) {
  window.Vue.use(VuePicture)
}
export default VuePicture;
