(function () {
  'use strict';
  angular
      .module('material.components.tabs')
      .directive('mdTabContent', MdTabContent);

  function MdTabContent ($compile, $mdUtil) {
    return { link: link };
    function link (scope, element) {
      var tab = scope.tab,
          contents = tab.contents;
      element.append(contents);
      $compile(element.contents())(tab.contentScope);
      if (scope.$index !== scope.$parent.selectedIndex) {
        scope.$$postDigest(function () { $mdUtil.disconnectScope(tab.contentScope); });
      }
    }
  }
})();
