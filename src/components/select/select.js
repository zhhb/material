(function() {
'use strict';
var selectNextId = 0;

function hashValue(value) {
  if (angular.isObject(value)) {
    return value.$$mdSelectId || (value.$$mdSelectId = ++selectNextId);
  }
  return value;
}

/*
<md-select ng-model="choice" ng-model-options="{ trackBy: 'choice.id' }">
  <md-option ng-repeat="opt in options">
  </md-option>
</md-select>
*/

angular.module('material.components.select', [
  'material.core'
])

.directive('mdSelect', SelectDirective)
.directive('mdLabel', LabelDirective)
.directive('mdOption', OptionDirective)
.directive('mdOptgroup', OptgroupDirective)
.provider('$mdSelect', SelectProvider);

function SelectDirective($parse) {

  return {
    restrict: 'E',
    require: ['mdSelect', 'ngModel'],
    scope: true,
    controller: SelectController,
    link: postLink
  };

  function postLink(scope, element, attr, ctrls) {
    var selectCtrl = ctrls[0];
    var ngModel = ctrls[1];
    var selectNode = element[0];

    selectCtrl.init(ngModel);

    element.on('click', function(ev) {
      var option;
      var currentNode = ev.target;
      while (currentNode && currentNode !== selectNode) {
        if (currentNode.$mdOption) {
          option = currentNode;
          break;
        }
        currentNode = currentNode.parentNode;
      }
      if (!option) return;

      scope.$apply(function() {
        var optionCtrl = angular.element(option).controller('mdOption');
        var optionHashKey = selectCtrl.hashGetter(optionCtrl.value);
        var isSelected = selectCtrl.isSelected(optionHashKey);

        if (selectCtrl.isMultiple) {
          if (isSelected) {
            selectCtrl.deselect(optionHashKey);
          } else {
            selectCtrl.select(optionHashKey, optionCtrl.value);
          }
        } else {
          if (!isSelected) {
            selectCtrl.deselect( Object.keys(selectCtrl.selected)[0] );
            selectCtrl.select( optionHashKey, optionCtrl.value );
          }
        }
        selectCtrl.refreshViewValue();
      });
    });
  }

  function SelectController($scope, $element, $attrs) {
    var self = this;
    self.options = {};
    self.selected = {};
    self.isMultiple = angular.isDefined($attrs.mdMultiple) || angular.isDefined($attrs.multiple);

    self.init = function(ngModel) {
      var ngModelExpr = $attrs.ngModel;

      if (ngModel.$options && ngModel.$options.trackBy) {
        var trackByLocals = {};
        var trackByParsed = $parse(ngModel.$options.trackBy);
        self.hashGetter = function(value, parseScope) {
          trackByLocals.$model = value;
          return trackByParsed(parseScope || $scope, trackByLocals);
        };
      } else {
        self.hashGetter = hashValue;
      }


      self.ngModel = ngModel;

      if (self.isMultiple) {
        ngModel.$validators['md-multiple'] = validateArray;
        ngModel.$render = renderMultiple;

        $scope.$watchCollection(ngModelExpr, function(value) {
          if (validateArray(value)) renderMultiple(value);
        });
      } else {
        ngModel.$render = renderSingular;
      }

      function validateArray(modelValue, viewValue) {
        var value = modelValue || viewValue;
        return !value ? true : angular.isArray(value);
      }
    };

    self.isSelected = function(hashKey) {
      return angular.isDefined(self.selected[hashKey]);
    };
    self.select = function(hashKey, hashedValue) {
      var option = self.options[hashKey];
      if (option) {
        option.setSelected(true);
      }
      self.selected[hashKey] = hashedValue;
    };
    self.deselect = function(hashKey) {
      var option = self.options[hashKey];
      if (option) {
        option.setSelected(false);
      }
      delete self.selected[hashKey];
    };

    self.addOption = function(hashKey, optionCtrl) {
      if (angular.isDefined(self.options[hashKey])) {
        throw new Error('Duplicate!');
      }
      // console.log('adding option', hashKey, '. selected?', !!self.selected[hashKey]);
      self.options[hashKey] = optionCtrl;
      if (self.isSelected(hashKey)) {
        self.select(hashKey, optionCtrl.value);
        self.refreshViewValue();
      }
    };
    self.removeOption = function(hashKey, optionCtrl) {
      delete self.options[hashKey];
    };

    self.refreshViewValue = function() {
      var values = [];
      var option;
      for (var hashKey in self.selected) {
         values.push( (option = self.options[hashKey]) && option.value || self.selected[hashKey]);
      }
      self.ngModel.$setViewValue(self.isMultiple ? values : values[0]);
    };

    function renderMultiple() {
      var newSelected = self.ngModel.$modelValue || self.ngModel.$viewValue || [];
      if (!angular.isArray(newSelected)) return;

      var oldSelected = Object.keys(self.selected);

      var newSelectedHashed = newSelected.map(self.hashGetter);
      var deselected = oldSelected.filter(function(hash) {
        return newSelectedHashed.indexOf(hash) === -1;
      });
      deselected.forEach(self.deselect);
      newSelectedHashed.forEach(function(hashKey, i) {
        self.select(hashKey, newSelected[i]);
      });
    }
    function renderSingular() {
      var value = self.ngModel.$viewValue || self.ngModel.$modelValue;
      Object.keys(self.selected).forEach(self.deselect);
      self.select( self.hashGetter(value), value );
    }
  }

}

function LabelDirective() {
}

function OptionDirective() {

  return {
    restrict: 'E',
    require: ['mdOption', '^mdSelect'],
    controller: OptionController,
    link: postLink
  };

  function postLink(scope, element, attr, ctrls) {
    var optionCtrl = ctrls[0];
    var selectCtrl = ctrls[1];
    var node = element[0];

    node.$mdOption = true;

    if (angular.isDefined(attr.ngValue)) {
      scope.$watch(attr.ngValue, changeOptionValue);
    } else if (angular.isDefined(attr.value)) {
      changeOptionValue(attr.value);
    } else {
      throw new Error("Expected either ngValue or value attr");
    }


    var latestHashKey;
    function changeOptionValue(newValue, oldValue) {
      var oldHashKey = selectCtrl.hashGetter(oldValue, scope);
      var newHashKey = selectCtrl.hashGetter(newValue, scope);

      optionCtrl.value = newValue;
      latestHashKey = newHashKey;

      selectCtrl.removeOption(oldHashKey, optionCtrl);
      selectCtrl.addOption(newHashKey, optionCtrl);
    }

    scope.$on('$destroy', function() {
      selectCtrl.removeOption(latestHashKey, optionCtrl);
    });
  }

  function OptionController($scope, $element, $attrs) {
    var self = this;
    self.scope = $scope;
    self.element = $element;
    self.selected = false;

    self.setSelected = function(isSelected) {
      if (isSelected && !self.selected) {
        self.element.attr('selected', 'selected');
      } else if (!isSelected && self.selected) {
        self.element.removeAttr('selected');
      }
      self.selected = isSelected;
    };
  }
  OptionController.prototype = {
    render: function(values) {
      var isMatch = values.indexOf(self.getValue()) !== -1;
      if (self.selected && !isMatch) {
        $element.removeClass('md-selected');
        self.selected = false;
      } else if (!self.selected && isMatch) {
        $element.addClass('md-selected');
        self.selected = true;
      }
    }
  };

}

function OptgroupDirective() {
}

function SelectProvider($$interimElementProvider) {
  return $$interimElementProvider('$mdSelect');
}

})();
