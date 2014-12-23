(function () {
  'use strict';

  angular
      .module('material.components.tabs')
      .directive('mdTabs', MdTabs);

  function MdTabs ($window, $mdConstant, $timeout, $mdUtil) {
    return {
      scope: {
        selectedIndex: '=?mdSelected',
        stretchTabs: '=?mdStretchTabs'
      },
      transclude: true,
      template: '\
        <md-tab-wrapper ng-class="{ \'md-stretch-tabs\': shouldStretchTabs() }">\
          <md-tab-data ng-transclude></md-tab-data>\
          <md-prev-button ng-if="selectedPage > 0" ng-click="prevPage()" tabindex="-1"><span \
              class="fa fa-chevron-left"></span></md-prev-button>\
          <md-next-button ng-if="selectedPage < pages.length - 1" ng-click="nextPage()" \
              tabindex="-1"><span class="fa fa-chevron-right"></span></md-next-button>\
          <md-tab-canvas ng-class="{ \'md-paginated\': shouldPaginate() }">\
            <md-pagination-wrapper data-page="{{selectedPage}}">\
              <md-ink-bar></md-ink-bar>\
              <md-tab-page ng-repeat="page in pages" data-page="{{$index}}">\
                  <md-tab-item \
                      tabindex="-1" \
                      class="md-tab" \
                      style="max-width: {{ tabWidth ? tabWidth + \'px\' : \'none\' }}" \
                      ng-repeat="tab in page" \
                      ng-class="{ \'md-active\': tab.getIndex() === selectedIndex, \
                          \'md-focus\': tab.getIndex() === focusIndex,\
                          \'md-disabled\': tab.disabled }" \
                      ng-disabled="tab.disabled" \
                      aria-selected="{{tab.getIndex() === selectedIndex}}" \
                      aria-disabled="{{tab.disabled}}" \
                      data-ng-click="select(tab.getIndex())">{{tab.label}}</md-tab>\
              </md-tab-page>\
            </md-pagination-wrapper>\
          </md-tab-canvas>\
        </md-tab-wrapper>\
        <md-tab-content-wrapper>\
          <md-tab-content \
              ng-repeat="tab in tabs" \
              ng-class="{ \
                \'md-active\': $index === selectedIndex || $index === lastIndex, \
                \'md-left\': selectedIndex > $index, \
                \'md-right\': selectedIndex < $index \
              }"></md-tab-content>\
        </md-tab-content-wrapper>\
      ',
      controller: 'MdTabsController',
      link: link
    };

    function link (scope, element, attr, ctrl) {

      var tabElements = element[0].getElementsByClassName('md-tab'),
          canvasElement = element[0].getElementsByTagName('md-tab-canvas'),
          inkBarElement = element[0].getElementsByTagName('md-ink-bar');

      ctrl.inkBarElement = inkBarElement;

      return init();

      function init () {
        scope.selectedIndex = angular.isNumber(scope.selectedIndex) ? scope.selectedIndex : 0;
        scope.selectedPage = 0;
        scope.focusIndex = null;
        scope.lastIndex = null;
        scope.tabs = [];
        scope.isMovingLeft = false;
        scope.isMovingRight = false;

        scope.select = function (index) { if (!scope.tabs[index].disabled) scope.focusIndex = scope.selectedIndex = index; };
        scope.focus = function (index) { scope.focusIndex = index; };
        scope.prevPage = function () {
          scope.selectedPage--;
          updateFocusIndex(false);
        };
        scope.nextPage = function () {
          scope.selectedPage++;
          updateFocusIndex(true);
        };
        scope.shouldPaginate = shouldPaginate;
        scope.keydown = keydown;
        scope.shouldStretchTabs = shouldStretchTabs;
        scope.addTab = addTab;
        scope.removeTab = removeTab;
        scope.pages = [];

        scope.$watch('selectedPage', onSelectedPageChange);
        scope.$watch('selectedIndex', onSelectedIndexChange);
        scope.$watch('focusIndex', onFocusIndexChange);
        angular.element($window).on('resize', function () {
          scope.$apply(handleWindowResize);
        });

        handleWindowResize();
      }

      function shouldStretchTabs () {
        switch (scope.stretchTabs) {
          case 0:
          case 'always': return true;
          case 'never':  return false;
          default:       return $window.matchMedia('(max-width: 600px)').matches;
        }
      }

      function updateFocusIndex (right) {
        var page = scope.pages[scope.selectedPage],
            leftIndex = page[0].getIndex(),
            rightIndex = page[page.length - 1].getIndex();
        scope.focusIndex = right ? leftIndex : rightIndex;
      }

      function onSelectedPageChange (newPage, oldPage) {
        if (newPage === oldPage
            || !scope.pages[newPage]
            || !angular.isNumber(scope.focusIndex)) return;
        updateFocusIndex(newPage > oldPage);
      }

      function getMaxWidth () {
        var maxWidth = 0;
        angular.forEach(scope.tabs, function (tab) {
          maxWidth = Math.max(tab.element.prop('offsetWidth'), maxWidth);
        });
        return maxWidth;
      }

      function shouldPaginate () {
        var canvasWidth = element.prop('clientWidth');
        if (shouldStretchTabs()) {
          return scope.tabs.length * getMaxWidth() > canvasWidth;
        } else {
          angular.forEach(scope.tabs, function (tab) {
            canvasWidth -= tab.element.prop('offsetWidth');
          });
          return canvasWidth < 0;
        }
      }

      function getItemsPerPage () {
        if (!shouldStretchTabs()) return;
        var canvasWidth = canvasElement[0].clientWidth;
        return Math.floor(canvasWidth / getMaxWidth());
      }

      function getPages () {
        if (!scope.tabs.length) return [];
        var pages = [],
            canvasWidth = canvasElement[0].clientWidth,
            cumulativeWidth = 0,
            tabToFocus;
        angular.forEach(scope.tabs, function (tab, index) {
          var tabWidth = tab.element.prop('offsetWidth'),
              pageNumber, page;
          cumulativeWidth += tabWidth;
          pageNumber = shouldStretchTabs()
              ? Math.floor(index / getItemsPerPage()) + 1
              : Math.ceil(cumulativeWidth / canvasWidth);
          page = pages[pageNumber - 1];
          if (!page) {
            cumulativeWidth = pages.length * canvasWidth + tabWidth;
            pages.push(page = []);
          }
          tab.page = Math.max(0, pageNumber - 1);
          page.push(tab);
        });
        tabToFocus = scope.tabs[typeof scope.focusIndex === 'number'
            ? scope.focusIndex
            : scope.selectedIndex];
        if (tabToFocus) scope.selectedPage = tabToFocus.page;
        return pages;
      }

      function handleWindowResize () {
        scope.lastIndex = scope.selectedIndex;
        scope.pages = getPages();
        //-- $timeout necessary to wait for redraw caused by getPages()
        $timeout(updateInkBarStyles, 0, false);
      }

      function keydown (event, data) {
        scope.$apply(function () {
          var newIndex;
          switch (event.keyCode) {
            case $mdConstant.KEY_CODE.LEFT_ARROW:
              handleArrowKey(-1);
              break;
            case $mdConstant.KEY_CODE.RIGHT_ARROW:
              handleArrowKey(1);
              break;
            case $mdConstant.KEY_CODE.SPACE:
            case $mdConstant.KEY_CODE.ENTER:
              event.preventDefault();
              scope.selectedIndex = scope.focusIndex = data.getIndex();
              break;
          }
          function handleArrowKey (inc) {
            event.preventDefault();
            scope.focusIndex = data.getIndex();
            for (newIndex = scope.focusIndex + inc;
                 scope.tabs[newIndex] && scope.tabs[newIndex].disabled;
                 newIndex += inc) {}
            if (scope.tabs[newIndex]) scope.focusIndex = newIndex;
          }
        });
      }

      function onFocusIndexChange (newValue, oldValue) {
        if (newValue === oldValue) return;
        if (!scope.tabs[newValue]) return;
        var page = scope.tabs[newValue].page;
        if (page !== scope.selectedPage) {
          scope.selectedPage = page;
        }
        if (typeof newValue === 'number')     scope.tabs[newValue].element.focus();
        else if(typeof oldValue === 'number') scope.tabs[oldValue].element.blur();
      }

      function onSelectedIndexChange (newValue, oldValue) {
        if (newValue === oldValue) return;
        scope.selectedIndex = newValue = getNearestSafeIndex(newValue);
        if (angular.isNumber(oldValue)) {
          $mdUtil.disconnectScope(scope.tabs[oldValue].contentScope);
        }
        if (angular.isNumber(newValue)) {
          $mdUtil.reconnectScope(scope.tabs[newValue].contentScope);
        }
        scope.lastIndex = oldValue;
        updateInkBarStyles(newValue);
        function getNearestSafeIndex (index) {
          if (!angular.isNumber(index)) {
            return getNearestSafeIndex(oldValue || 0);
          }
          var maxOffset = Math.max(scope.tabs.length - index, index),
              i, tab;
          for (i = 0; i <= maxOffset; i++) {
            tab = scope.tabs[index + i];
            if (tab && (tab.disabled !== true && tab.active !== false)) return tab.getIndex();
            tab = scope.tabs[index - i];
            if (tab && (tab.disabled !== true && tab.active !== false)) return tab.getIndex();
          }
          return index;
        }
      }

      function updateInkBarStyles (index) {
        if (!scope.tabs.length) return;
        if (index == null) index = scope.selectedIndex;
        var totalWidth = canvasElement[0].offsetWidth,
            tabData = scope.tabs[index],
            tab = angular.element(tabElements[index]),
            page = tabData.page,
            pageOffset = page * tab.parent().prop('offsetWidth'),
            left = tab.prop('offsetLeft') + pageOffset,
            right = totalWidth - left - tab.prop('offsetWidth');
        updateInkBarClassName();
        angular.element(inkBarElement[0]).css({ left: left + 'px', right: right + 'px' });
      }

      function updateInkBarClassName () {
        var newIndex = scope.selectedIndex,
            oldIndex = scope.lastIndex,
            ink = angular.element(inkBarElement[0]);
        ink.removeClass('md-left md-right');
        if (newIndex < oldIndex) {
          ink.addClass('md-left');
        } else if (newIndex > oldIndex) {
          ink.addClass('md-right');
        }
      }

      function addTab (element, label, disabled, active, contentScope) {
        var data = {
          element: element,
          contents: element.contents().remove().clone(),
          active: active,
          disabled: disabled,
          label: label,
          page: 0,
          contentScope: contentScope,
          getIndex: function () {
            return scope.tabs.indexOf(data);
          },
          setLabel: function (value) {
            this.label = value;
            handleWindowResize();
          }
        };
        scope.tabs.push(data);
        element.attr({ tabindex: disabled ? -1 : 0 });
        element.on('keydown', function (event) { return keydown(event, data); });
        element.on('focus', function () {
          if (data.getIndex() === scope.focusIndex) return;
          scope.$apply(function () { scope.focus(data.getIndex()); });
        });
        element.on('blur', function () {
          if (data.getIndex() !== scope.focusIndex) return;
          scope.$apply(function () { scope.focus(); });
        });
        scope.pages = getPages();
        handleWindowResize();
        //-- reset selectedIndex to force validation
        //   most times, this will automatically jump back to its old value
        scope.selectedIndex = null;
        return data;
      }

      function removeTab (data) {
        var index = scope.tabs.indexOf(data);
        scope.tabs.splice(index, 1);
        handleWindowResize();
        //-- reset selectedIndex to force validation
        //   most times, this will automatically jump back to its old value
        scope.selectedIndex = null;
      }
    }
  }
})();