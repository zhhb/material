/**
 * @ngdoc module
 * @name material.components.sidenav
 *
 * @description
 * A Sidenav QP component.
 */
angular.module('material.components.sidenav', [
  'material.core',
  'material.services.registry',
  'material.services.media',
  'material.animations'
])
  .factory('$mdSidenav', mdSidenavService)
  .directive('mdSidenav', mdSidenavDirective)
  .controller('$mdSidenavController', mdSidenavController);

/*
 * @private
 * @ngdoc service
 * @name $mdSidenav
 * @module material.components.sidenav
 *
 * @description
 * $mdSidenav makes it easy to interact with multiple sidenavs
 * in an app.
 *
 * @usage
 *
 * ```javascript
 * // Toggle the given sidenav
 * $mdSidenav(componentId).toggle();
 *
 * // Open the given sidenav
 * $mdSidenav(componentId).open();
 *
 * // Close the given sidenav
 * $mdSidenav(componentId).close();
 * ```
 */
mdSidenavService.$inject = ['$mdComponentRegistry'];
function mdSidenavService($mdComponentRegistry) {
  return function(handle) {
    var instance = $mdComponentRegistry.get(handle);
    if(!instance) {
      $mdComponentRegistry.notFoundError(handle);
    }

    return {
      isOpen: function() {
        return instance && instance.isOpen();
      },
      toggle: function() {
        instance && instance.toggle();
      },
      open: function() {
        instance && instance.open();
      },
      close: function() {
        instance && instance.close();
      }
    };
  };
}

/*
 * @private
 * @ngdoc object
 * @name mdSidenavController
 * @module material.components.sidenav
 *
 * @description
 * The controller for mdSidenav components.
 */
mdSidenavController.$inject = ['$scope', '$element', '$attrs', '$timeout', '$mdSidenav', '$mdComponentRegistry'];
function mdSidenavController($scope, $element, $attrs, $timeout, $mdSidenav, $mdComponentRegistry) {

  var self = this;

  $mdComponentRegistry.register(this, $attrs.componentId);

  this.isOpen = function() {
    return !!$scope.isOpen;
  };
  this.toggle = function() {
    $scope.isOpen = !$scope.isOpen;
  };
  this.open = function() {
    $scope.isOpen = true;
  };
  this.close = function() {
    $scope.isOpen = false;
  };
}


/**
 * @ngdoc directive
 * @name mdSidenav
 * @module material.components.sidenav
 * @restrict E
 *
 * @description
 *
 * A Sidenav component that can be opened and closed programatically.
 *
 * Must have either an 'md-sidenav-left' or 'md-sidenav-right' class.
 *
 * By default, upon opening it will slide out on top of the main content area.
 *
 * @usage
 * <hljs lang="html">
 * <div layout="horizontal" ng-controller="MyController">
 *   <md-sidenav component-id="left" class="md-sidenav-left">
 *     Left Nav!
 *   </md-sidenav>
 *
 *   <md-content>
 *     Center Content
 *     <md-button ng-click="openLeftMenu()">
 *       Open Left Menu
 *     </md-button>
 *   </md-content>
 *
 *   <md-sidenav component-id="right"
 *     is-locked-open="$media('min-width: 333px')"
 *     class="md-sidenav-right">
 *     Right Nav!
 *   </md-sidenav>
 * </div>
 * </hljs>
 *
 * <hljs lang="js">
 * var app = angular.module('myApp', ['ngMaterial']);
 * app.controller('MyController', function($scope, $mdSidenav) {
 *   $scope.openLeftMenu = function() {
 *     $mdSidenav('left').toggle();
 *   };
 * });
 * </hljs>
 *
 * @param {expression=} is-open A model bound to whether the sidenav is opened.
 * @param {boolean=} draggable Whether the user can drag out the sidenav. Default true.
 * @param {number=} edge-drag-buffer The maximum distance from the edge of the
 * screen that the user can start dragging to bring out the sidenav. Default 50 pixels.
 * @param {string=} component-id componentId to use with $mdSidenav service.
 * @param {expression=} is-locked-open When this expression evalutes to true,
 * the sidenav 'locks open': it falls into the content's flow instead
 * of appearing over it. This overrides the `is-open` attribute.
 *
 * A $media() function is exposed to the is-locked-open attribute, which
 * can be given a media query or one of the `sm`, `md` or `lg` presets.
 * Examples:
 *
 *   - `<md-sidenav is-locked-open="shouldLockOpen"></md-sidenav>`
 *   - `<md-sidenav is-locked-open="$media('min-width: 1000px')"></md-sidenav>`
 *   - `<md-sidenav is-locked-open="$media('sm')"></md-sidenav>` <!-- locks open on small screens !-->
 */
mdSidenavDirective.$inject = ['$timeout', '$animate', '$parse', '$mdMedia', '$mdConstant', '$controller', '$$rAF', '$mdEffects'];
function mdSidenavDirective($timeout, $animate, $parse, $mdMedia, $mdConstant, $controller, $$rAF, $mdEffects) {
  return {
    restrict: 'E',
    scope: {
      isOpen: '=?',
      edgeDragBuffer: '=?',
      draggable: '=?',
    },
    controller: '$mdSidenavController',
    compile: function(element, attr) {
      angular.isUndefined(attr.edgeDragBuffer) && attr.$set('edgeDragBuffer', '50');
      angular.isUndefined(attr.draggable) && attr.$set('draggable', 'true');
      element.addClass('closed');
      element.attr('tabIndex', '-1');
      return postLink;
    }
  };

  function postLink(scope, element, attr, sidenavCtrl) {
    var isLockedOpenParsed = $parse(attr.isLockedOpen);
    var backdrop = angular.element(
      '<md-backdrop class="md-sidenav-backdrop opaque">'
    );

    scope.$watch('isOpen', setOpen);
    scope.$watch(function() {
      return !!isLockedOpenParsed(scope.$parent, {
        $media: $mdMedia
      });
    }, function(isLocked) {
      element.toggleClass('locked-open', isLocked);
      backdrop.toggleClass('locked-open', isLocked);
      scope.isLockedOpen = isLocked;
    });

    var sidenavParentCtrl = element.controller('mdSidenavParent');
    if (!sidenavParentCtrl) {
      element.parent().data(
        '$mdSidenavParentController',
        sidenavParentCtrl = $controller(SidenavParentController, {
          $scope: element.parent().scope(),
          $element: element.parent()
        })
      );
    }

    sidenavParentCtrl.addMenu({
      element: element,
      getSide: function() {
        return element.hasClass('md-sidenav-left') ? 'left' : 'right';
      },
      isOpen: function() { 
        return scope.isOpen; 
      },
      isPannable: function(ev) {
        if (!scope.draggable) return false;
        // If the sidenav is open, it's always pannable, whether the 
        // user is dragging from the edge of the screen or not.
        if (scope.isOpen) return true;

        if (this.getSide() === 'left') {
          return ev.center.x < scope.edgeDragBuffer;
        } else {
          var parentRight = sidenavParentCtrl.element[0].getBoundingClientRect().right;
          return ev.center.x > parentRight - scope.edgeDragBuffer;
        }
      },
      startTransform: function() {
        element.removeClass('closed').addClass('no-animate');
        // Cache the side so we won't have to run hasClass() every frame
        this.side = this.getSide();
        this.transforming = true;
        this.transformStart = this.side == 'left' ?
          (scope.isOpen ? 0 : -1) :
          (scope.isOpen ? -1 : 0);
        this.transform(0);
      },
      transform: function(percent) {
        if (!this.transforming) return;
        var amount = clamp(-1, this.transformStart - percent, 0);
        element.css($mdEffects.TRANSFORM, 'translate3d(' + 304*amount + 'px,0,0)');
      },
      stopTransform: function(percent, newState, ev) {
        var duration = Math.min(200,
          Math.abs( ((1 - percent) * 304) / (1.25 * ev.velocity) )
        );
        element.removeClass('no-animate');
        this.transforming = false;

        scope.$apply(function() {
          element.css($mdEffects.TRANSITION_DURATION, duration + 'ms');
          setOpen(newState).then(function() {
            element.css($mdEffects.TRANSITION_DURATION, '');
          });
        });
        $$rAF(function() { 
          $$rAF(function() {
            element.css($mdEffects.TRANSFORM, '');
          });
        });
      }
    });

    function clamp(min, n, max) {
      return Math.max(min, Math.min(n, max));
    }

    /**
     * Toggle the SideNav view and attach/detach listeners
     * @param isOpen
     */
    function setOpen(isOpen) {
      scope.isOpen = isOpen;
      var parent = element.parent();

      parent[isOpen ? 'on' : 'off']('keydown', onKeyDown);
      $animate[isOpen ? 'enter' : 'leave'](backdrop, parent);
      backdrop[isOpen ? 'on' : 'off']('click', close);

      return $animate[isOpen ? 'removeClass' : 'addClass'](element, 'closed')
      .then(function() {
        // If we opened, and haven't closed again before the animation finished
        if (scope.isOpen) {
          element.focus();
        }
      });
    }

    /**
     * Auto-close sideNav when the `escape` key is pressed.
     * @param evt
     */
    function onKeyDown(ev) {
      if (ev.which === $mdConstant.KEY_CODE.ESCAPE) {
        close();
      }
    }

    function close() {
      $timeout(function(){
        sidenavCtrl.close();
      });
    }
  }

}

SidenavParentController.$inject = ['$scope', '$element', '$mdEffects', '$$rAF'];
function SidenavParentController(scope, element, $mdEffects, $$rAF) {

  var menus = [];
  var self = this;

  self.element = element;

  self.addMenu = function(menu, setOpen) {
    menus.push(menu);
    menu.element.on('$destroy', function() {
      menus.splice(menus.indexOf(menu), 1);
    });
  };

  function getMenu(side) {
    for (var i = 0; i < menus.length; i++) {
      if (menus[i].getSide() == side) return menus[i];
    }
  }

  var panMenu;
  attachPan(scope, element, {
    getDistance: function() { 
      return 304; 
    },
    onStart: function(ev) {
      var leftMenu, rightMenu;
      if ((leftMenu = getMenu('left')) && leftMenu.isPannable(ev)) {
        panMenu = leftMenu;
      } else if ((rightMenu = getMenu('right')) && rightMenu.isPannable(ev)) {
        panMenu = rightMenu;
      }
      panMenu && panMenu.startTransform();
    },
    onPan: function(percent, ev) {
      if (!panMenu || percent === 0) return;
      panMenu.transform(percent);
    },
    onEnd: function(percent, success, ev) {
      if (!panMenu) return;
      panMenu.stopTransform(
        percent,
        success ? !panMenu.isOpen() : panMenu.isOpen(),
        ev
      );
      panMenu = null;
    }
  });
}

function attachPan(scope, element, opts) {
  opts = angular.extend({
    getDistance: function() {
      return element.prop('offsetWidth');
    },
    isHorizontal: true,
    successPercent: 0.5,
    successVelocity: 1 / 8, // velocity in pixels/ms
    onStart: angular.noop,
    onPan: angular.noop,
    onEnd: angular.noop
  }, opts || {});

  var direction = opts.isHorizontal ? Hammer.DIRECTION_HORIZONTAL : Hammer.DIRECTION_VERTICAL;
  var getPosition = opts.isHorizontal ?
    function(ev) { return ev.center.x; } :
    function(ev) { return ev.center.y; };

  var hammertime = new Hammer(element[0], {
    recognizers: [
      [Hammer.Pan, { direction: direction }]
    ]
  });
  scope.$on('$destroy', function() {
    hammertime.destroy();
  });

  var pan;
  hammertime.on('panstart', function(ev) {
    if (pan) return;
    pan = {
      start: getPosition(ev),
      distance: opts.getDistance()
    };
    opts.onStart(ev);
  });
  hammertime.on('pan', function(ev) {
    if (!pan || ev.isFinal) return;
    var percent = getDragPercent( getPosition(ev) );
    opts.onPan(percent, ev);
  });
  hammertime.on('panend', function(ev) {
    if (!pan) return;
    var percent = getDragPercent( getPosition(ev) );
    var isSuccessful = Math.abs(percent) > opts.successPercent ||
      Math.abs(ev.velocity) > opts.successVelocity;
    opts.onEnd(percent, isSuccessful, ev);
    pan = null;
  });

  function getDragPercent(pos) {
    return (pan.start - pos) / pan.distance;
  }
}

