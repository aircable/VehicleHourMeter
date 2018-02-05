# Vehicle Hour Meter

Will connect to the AIRcable SuperBridge serial port at 115200 baud and interprets the mesh packets.


You will not be able to add this to your normal website.

This library only works in a [Chrome Packaged App](http://developer.chrome.com/apps/about_apps.html) as this is the only way to get access to the [serial ports API](http://developer.chrome.com/apps/serial.html) in the browser. Incidentally, since [NW.js](http://nwjs.io/) (a.k.a. node-webkit) now fully supports the Chrome Packaged App platform, this means you can also use this library in NW.js v0.13+.

If you want help making your first Chrome App, read the ["Create Your First App"](http://developer.chrome.com/apps/first_app.html) tutorial.

There is currently no Firefox extension support but that might come soon if possible.


Known incompatibilities with node-serialport
-------------------------------------------
* Parsers not implemented
* Inconsistent error messages
* Chrome has a slightly different options set:
    * __dataBits__: 7, 8
    * __stopBits__: 1, 2
    * __parity__: 'none', 'even', 'mark', 'odd', 'space'
    * __flowControl__: 'RTSCTS'


