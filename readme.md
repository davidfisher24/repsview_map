## About 

This is a demo version of a map that will show pharmaceutical UGAs and their related statistics in France. Zones locations
have been parsed by using a central point of all the department postal codes located within that uga. For this reason
many ugas, that are close together will fall on top of each other. The latitutude and the longitude of each can uga can
be moved by an admin user (test by clicking the mod button)

Current features:

- Two networks with geographical data that can be switched between
- Automatic zoom in and out to drill down into sub levels
- Related statistics presented in overlay pies with a side legend, and side bar bar chart
- City names which can be turned on or off and changed by range size
- Each zone can be turned on or off, and a rezoom applied.

Libraries

- d3. Current using version 3.5. Requires update to version 4
- topojson
- Backbone and underscore dependency
- bootstrap
- compiled by Grunt CLI



