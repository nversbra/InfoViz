
var blackHole = function (u, v) {

    //rs = 5; 
    var mass = 2.5;

    //u = 2 * mass + u * (25-2*mass);
    var R = u * 25;
    v = v * 2 * Math.PI;
    //var r =  1/4 * (4 * Math.pow(rs, 2) + Math.pow(u, 2));
    /*var rho;
    //if (r > rs)
    rho = Math.sqrt((r - rs) * r) + 1/2 * rs * Math.log( 2 * r  * (Math.sqrt(1 - rs/r) + 1)  - rs);
   // else
     //   rho = 0;
    var x = rho * Math.cos(v);
    var y = u - 10 ;
    var z = rho * Math.sin(v);*/

    var x = R * Math.cos(v);
    var y; 
    var z = R * Math.sin(v);
    
    if (R > 2 * mass){
        y = Math.sqrt(R * 8 * mass) - Math.sqrt(25 * 8 * 2.5); 
    }
    else 
        y = - R - Math.sqrt(25 * 8 * 2.5); 
    return new THREE.Vector3(x, y, z);

    
};

var starY = function(u, mass){

    var R = data.radius;  // radius of the star 
    var rmax =  5 * R; // maximal distance plotted 
    var r = u * rmax;
    var R3 = Math.pow(R,3);
    var M = mass;

    var max_y = Math.sqrt(R3 / (2 * M)) * ( 1 - Math.sqrt(1 - 2 * M / R)) + Math.sqrt(8 * M *(rmax-2*M)) - Math.sqrt(8 * M *(R-2*M));

    var y = -max_y; 

    if (M == 0)
        y = 0;
    else {
        if (r > R){
            y += Math.sqrt(R3 / (2 * M)) * ( 1 - Math.sqrt(1 - 2 * M / R)) + Math.sqrt(8 * M *(r-2*M)) - Math.sqrt(8 * M *(R-2*M));
        } 
        else {
            y+= Math.sqrt(R3 / (2 * M)) * ( 1 - Math.sqrt(1 - 2 * M * Math.pow(r,2) / R3));
        }
    }
    return y; 

}


var staticStar = function(u, v){
// u is radial distance to the center in the euclidian space
// v is the angle 

    var R = data.radius;  // radius of the star 
    var rmax =  5 * R;
    v = v * 2 * Math.PI; // v scaled to angle range 
    var y = starY(u, data.mass )
    var r = u * rmax;
    var x = r * Math.cos(v);
    var z = r * Math.sin(v);
    return new THREE.Vector3(x, y, z);
}

var radialFlat = function(u, v){
// u is radial distance to the center in the euclidian space
// v is the angle 

    var density = 0; 
    var R = data.radius;  // radius of the star 
    var rmax =  5 * R;
    v = v * 2 * Math.PI; // v scaled to angle range 
    var y = starY(u, density);
    var r = u * rmax;
    var x = r * Math.cos(v);
    var z = r * Math.sin(v);
    return new THREE.Vector3(x, y, z);
}


var starPath = function(u, symmetricPart){

    var R = data.radius;  // radius of the star 
    var rmax =  5 * R;
    var y = starY(u, data.mass);
    var r = u * rmax;
    
    var x = r * Math.cos(u/10);
    if (symmetricPart)
        return new THREE.Vector3(-x, y, 0);
    else {
        return new THREE.Vector3(x, y, 0);

    }
        
}

