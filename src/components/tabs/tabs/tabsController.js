(function () {
  'use strict';

  angular
      .module('material.components.tabs')
      .controller('MdTabsController', MdTabsController);

  function MdTabsController ($scope) {
    this.setIndex  = function (value) { return $scope.selectedIndex = value; };
    this.getIndex  = function () { return $scope.selectedIndex; };
    this.addTab    = function () { return $scope.addTab.apply($scope, arguments); };
    this.removeTab = function () { return $scope.removeTab.apply($scope, arguments); };
  }
})();