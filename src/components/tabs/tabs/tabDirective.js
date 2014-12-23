(function () {
  'use strict';

  angular
      .module('material.components.tabs')
      .directive('mdTab', MdTab);

  function MdTab () {
    return {
      require: '^mdTabs',
      terminal: true,
      scope: {
        label: '@',
        mdActive: '=?',
        ngDisabled: '=?'
      },
      link: link
    };

    function link (scope, element, attr, tabsCtrl) {
      var data = tabsCtrl.addTab(element, attr.label, scope.ngDisabled, scope.mdActive, scope.$parent.$new());
      scope.$on('$destroy', function () { tabsCtrl.removeTab(data); });
      scope.$watch('label', function (newValue) { data.setLabel(newValue); });
      scope.$watch('ngDisabled', function (newValue, oldValue) {
        data.disabled = newValue;
        element.attr({ disabled: newValue, ariaDisabled: newValue });
        if (newValue && !oldValue) {
          tabsCtrl.setIndex();
        }
      });
      scope.$watch('mdActive', function (newValue, oldValue) {
        data.active = newValue;
        if (newValue) {
          tabsCtrl.setIndex(data.getIndex());
        } else if (!newValue && oldValue) {
          tabsCtrl.setIndex();
        }
      });
    }
  }
})();
