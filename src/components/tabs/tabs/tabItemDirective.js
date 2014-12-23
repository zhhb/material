(function () {
  'use strict';

  angular
      .module('material.components.tabs')
      .directive('MdTabItem', MdTabItem);

  function MdTabItem ($mdInkRipple) {
    return {
      require: '^mdTabs',
      link: link
    };
    function link (scope, element, attr, tabsCtrl) {
      scope.$watch('tab.disabled', function (newValue, oldValue) {
        var detachRippleFn;
        if (newValue) {
          detachRippleFn = $mdInkRipple.attachTabBehavior(scope, element, {
            colorElement: tabsCtrl.inkBarElement
          });
          scope.$on('$destroy', function () { detachRippleFn(); });
        } else if (oldValue && detachRippleFn) {
          detachRippleFn();
        }
      });
    }
  }
})();