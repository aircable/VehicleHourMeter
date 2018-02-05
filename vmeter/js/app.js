


function onError(e) {
    console.log(e);
}

//

var gDriveApp = angular.module('meshTimeMonitorApp', []);

gDriveApp.factory('gdocs', function() {
    var gdocs = new GDocs();

    var dnd = new DnDFileController('body', function(files) {
        var $scope = angular.element(this).scope();
        Util.toArray(files).forEach(function(file, i) {
            gdocs.upload(file, function() {
                $scope.fetchDocs(true);
            }, true);
        });
    });

    return gdocs;
});

// Main Angular controller for app.
function DevicesController($scope, $http, gdocs) {
    $scope.docs = [];
}

DevicesController.$inject = ['$scope', '$http', 'gdocs']; // For code minifiers.

// Init setup and attach event listeners.
document.addEventListener('DOMContentLoaded', function(e) {

    var closeButton = document.querySelector('#close-button');

    closeButton.addEventListener('click', function(e) {
        window.close();
    });

});