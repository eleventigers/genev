//    Genev.js 0.0.1
//    Original code from from http://www.csse.monash.edu.au/~cema/evoeco/
//    Ported by Jokubas Dargis jokubas@harmonypark.net

'use strict';
(function(root, factory) {

  if (typeof exports !== 'undefined') {
    factory(root, exports, require('underscore'));
  } else if (typeof define === 'function' && define.amd) {
    define(['underscore', 'exports'], function(_, exports) {
      root.Genev = factory(root, exports, _);
    });
  } else {
    root.Genev = factory(root, {}, root._);
  }
} (this, function(root, Genev, _) {

  Genev.VERSION = '0.0.1';

  // Frequently used functions accros Genev
  // --------------------------------------

  var utils = {
    gaussRandom: function () {
      var x1, x2, rad, y1;
      do {
        x1 = 2 * Math.random() - 1;
        x2 = 2 * Math.random() - 1;
        rad = x1 * x1 + x2 * x2;
      } while(rad >= 1 || rad === 0);
      var c = Math.sqrt(-2 * Math.log(rad) / rad);
      return x1 * c;
    },
    limit: function ( x, min, max ) {
      if( x < min ) {
        return min;
      } else if( x > max) {
        return max;
      } else {
        return x;
      }
    },
    ringify: function ( x ) {
      if( x > 1 ) {
        return x - 1;
      } else if( x < 0) {
        return 1 + x;
      } else {
        return x;
      }
    },

    probFn: function ( val, prob, fx, fy ) {
      var args = Array.prototype.slice.call(arguments),
        extraArgs,
        prob = prob || 0;
      if(args.length > 4){
        extraArgs = args.slice(4);
        extraArgs.unshift(val);
      }
      return (Math.random() < prob) ? ((!extraArgs) ? fx(val) : fx.apply(null, extraArgs)) : ((!extraArgs) ? fy(val) : fy.apply(null, extraArgs));
    },
    parseBoolean: function( value ){
      return (value === 'true') ? true : false;
    },
    populateArray: function(size, val) {
      return _.map(new Float32Array(size), function(){
        if(val instanceof Array){
          return new Float32Array(val);
        } else {
          return val;
        }
      });
    },
    generateMatrix: function(cols, rows, val){
      return this.populateArray(cols, this.populateArray(rows, val));
    },
    probab: function( prob, fn ){
      fn = fn || Math.random;
      return fn() < prob;
    },
    toType: function(obj) {
      return ({}).toString.call(obj).match(/\s([a-z|A-Z]+)/)[1].toLowerCase();
    },
    rgbToHsb: function(r, g, b){
      var hue, saturation, brightness, hsbvals = [], cmax, cmin, redc, greenc, bluec;
      cmax = ( r > g ) ? r : g;
      if ( b > cmax ) {
        cmax = b;
      }
      cmin = ( r < g ) ? r : g;
      if ( b < cmin ) {
        cmin = b;
      }
      brightness = ( cmax / 255 );
      if ( cmax !== 0 ){
        saturation = ( cmax - cmin ) / cmax;
      } else {
        saturation = 0;
      }
      if ( saturation === 0 ) {
        hue = 0;
      } else {
        redc = ( cmax - r ) / ( cmax - cmin );
        greenc = ( cmax - g ) / ( cmax - cmin );
        bluec = ( cmax - b ) / ( cmax - cmin );
        if ( r === cmax ) {
          hue = bluec - greenc;
        } else if ( g === cmax ) {
            hue = 2.0 + redc - bluec;
        } else {
            hue = 4.0 + greenc - redc;
        }
        hue = hue / 6.0;
        if  (hue < 0 ) {
          hue = hue + 1.0;
        }
      }
      hsbvals[0] = hue;
      hsbvals[1] = saturation;
      hsbvals[2] = brightness;
      return hsbvals;
    },
    hsvToRgb: function(h, s, v){
      var r, g, b, i, f, p, q, t;

      if(s === 0){
        r = g = b = v;
        return[Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
      }

      h *= 6;
      i  = Math.floor(h);
      f = h - i;
      p = v *  (1 - s);
      q = v * (1 - s * f);
      t = v * (1 - s * (1 - f));
      switch( i ) {
        case 0:
          r = v;
          g = t;
          b = p;
          break;
        case 1:
          r = q;
          g = v;
          b = p;
          break;
        case 2:
          r = p;
          g = v;
          b = t;
          break;
        case 3:
          r = p;
          g = q;
          b = v;
          break;
        case 4:
          r = t;
          g = p;
          b = v;
          break;
        default:
          r = v;
          g = p;
          b = q;
          break;
      }
      return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
    }

  };

  // Genev function placeholder
  // --------------------------

  var noop = function(){};

  // Genev.Individual
  // ----------------

  //
  // TODO: description
  //

  var individualDefaults = {
    options: {
      useColor: true,
      useSaturation: true,
      width: 100,
      height: 100,
      maxAgents: 10,
      minAgents: 3,
      wrapAround: true
    }
  };

  var Individual = Genev.Individual = function( attributes ){

    attributes = attributes || {};

    var options = _.clone(individualDefaults.options);

    this.startH = Math.random();
    this.startS = Math.random();
    this.startB = Math.random();

    _.extend(options, attributes.options);

    attributes.options = options;

    _.extend(this, attributes);

    this.options.numAgents = this.options.numAgents || Math.round(Math.random() * (this.options.maxAgents - this.options.minAgents) + this.options.minAgents);

    this.agents = (this.agents) ? ( (this.agents[0] instanceof Agent) ? this.agents :_.map(this.agents, function(a, idx, l){ return new Agent(a);})) : this.generateAgents(this.options);

    this.maxTime = 2 * this.options.width * this.options.height;
    this.time = 0;
    this.developed = false;
    this.h = utils.generateMatrix(this.options.width, this.options.height, this.startH);
    this.s = utils.generateMatrix(this.options.width, this.options.height, this.startS);
    this.b = utils.generateMatrix(this.options.width, this.options.height, this.startB);

    this.initialize.apply(this, arguments);

    return this;
  };

  _.extend(Individual.prototype, {

    initialize: noop,

    generateAgents: function( options ){

      return _.map(_.range(options.numAgents), function(v, i, l){
        return new Agent({options: _.clone(options), index: i });
      });
    },

    step: function( steps ) {
      var res, pos, steps = steps || 1;
      if(this.developed){
        return this;
      } else {
        for(var i = 0; i < steps; ++i){
          ++this.time;
          _.each(this.agents, function(agent){
            res = agent.step(this, this.time);
            if(res){
              pos = res.currPos();
              this.h[pos.x][pos.y] = res.h;
              this.s[pos.x][pos.y] = res.s;
              this.b[pos.x][pos.y] = res.b;
              res.nextPos();
            }
          }, this);

        }

        if(this.time >= this.maxTime) {
          this.developed = true;
        }
        return this;
      }
    },

    clone: function() {
      var newAgents = _.map(this.agents, function(v, i, l){
        return l[i].clone().setIndex(i);
      }, this);
      return new Individual({
        options: _.clone(this.options),
        startH: this.startH,
        startS: this.startS,
        startB: this.startB,
        agents: newAgents
      });
    },

    mutate: function( prob ) {
      var self = this,
          newNumAgents = this.options.numAgents,
          newAgents = [], replace, swap,
          newWrapAround = this.options.wrapAround,
          newStartColors = _.map([this.startH, this.startS, this.startB], function(v, i, l){
            return (utils.probab(prob)) ? utils.ringify(l[i] + utils.gaussRandom()) : l[i];
          });

      if((utils.probab(2 * prob)) && (this.options.numAgents < (individualDefaults['maxAgents']) - 1)){
        ++newNumAgents;
        newAgents = _.map(_.range(newNumAgents - 1), function(v, i, l){
          return this.agents[i].clone().setIndex(i);
        }, this);
        replace = newNumAgents - 1;
        if(utils.probab(0.75)){
          newAgents[replace] = new Agent({
            options: _.clone(this.options),
            index: replace
          });
        } else {
          swap = Math.floor(Math.random() * replace);
          newAgents[newNumAgents - 1] = this.agents[swap].clone().setIndex(replace);
        }
      } else if ((utils.probab(2 * prob)) && (this.options.numAgents > individualDefaults['minAgents'])){
        --newNumAgents;
        newAgents = _.map(_.range(newNumAgents), function(v, i, l){
          return this.agents[i].clone().setIndex(i);
        }, this);
        swap = Math.floor(Math.random() * newNumAgents);
        newAgents[swap] = this.agents[newNumAgents].clone().setIndex(swap);
      } else {
        newAgents = _.map(_.range(newNumAgents), function(v, i, l){
          return this.agents[i].clone().setIndex(i);
        }, this);
      }

      return new Individual({
        options: _.extend(_.clone(this.options), {
            wrapAround: newWrapAround,
            numAgents: newNumAgents
        }),
        startH: newStartColors[0],
        startS: newStartColors[1],
        startB: newStartColors[2],
        agents: newAgents
      });
    },

    crossover: function( individual ) {
      var newNumAgents = (utils.probab(0.5)) ? individual.options.numAgents : this.options.numAgents,
        newWrapAround = (utils.probab(0.5)) ? individual.options.wrapAround : this.options.wrapAround,
        newH = (utils.probab(0.5)) ? individual.startH : this.startH,
        newS = (utils.probab(0.5)) ? individual.startS : this.startS,
        newB = (utils.probab(0.5)) ? individual.startB : this.startB,
        newAgents, cross;

      newAgents = _.map(_.range(newNumAgents), function(v, i, l){
        if(utils.probab(0.33)) {
          return this.agents[Math.floor(Math.random()* this.options.numAgents)].clone().setIndex(i);
        } else if(utils.probab(0.5)) {
          cross = individual.agents[Math.floor(Math.random()* individual.options.numAgents)];
          return this.agents[Math.floor(Math.random()* this.options.numAgents)].crossover(cross).setIndex(i);
        } else {
          return this.agents[Math.floor(Math.random()* this.options.numAgents)].clone().setIndex(i);
        }
      }, this);

      return new Individual(_.extend(_.clone(this.options), {
        options: _.extend(_.clone(this.options), {
            wrapAround: newWrapAround,
            numAgents: newNumAgents
        }),
        startH: newH,
        startS: newS,
        startB: newB,
        agents: newAgents
      }));
    },

    toJSON: function() {
      return JSON.stringify(
        _.pick(
          this,
          'options',
          'startH',
          'startS',
          'startB',
          'agents'
        )
      );
    },

    fromJSON: function( string ) {
      var obj = JSON.parse(string);
      return new Individual(obj);
    },

    fromRGBA: function( arr ){
      var width = this.options.width,
          height = this.options.height,
          row,
          hsb,
          rgba = arr,
          r, g, b, a,
          hT = 0, sT = 0, bT = 0;

      for(var y = 0; y < height; ++y){
        row = width * y;
        for(var x = 0; x < width; ++x){
          r = rgba[(row + x) * 4];
          g = rgba[(row + x) * 4 + 1];
          b = rgba[(row + x) * 4 + 2];
          a = rgba[(row + x) * 4 + 3];
          hsb = utils.rgbToHsb( r, g, b );
          this.h[x][y] = hsb[0];
          this.s[x][y] = hsb[1];
          this.b[x][y] = hsb[2];
          hT += hsb[0];
          sT += hsb[1];
          bT += hsb[2];
        }
      }
      this.startH = hT / (width * height);
      this.startS = sT / (width * height);
      this.startB = bT / (width * height);
      return this;
    },

    getRGBA: function() {
      var width = this.options.width,
          height = this.options.height,
          row,
          h = this.h,
          s = this.s,
          b = this.b,
          rgb,
          raw = new Uint8ClampedArray(width * height * 4);

      for(var y = 0; y < height; ++y){
        row = width * y;
        for(var x = 0; x < width; ++x){
          rgb = utils.hsvToRgb(h[x][y], s[x][y], b[x][y]);
          raw[(row + x) * 4] = rgb[0];
          raw[(row + x) * 4 + 1] = rgb[1];
          raw[(row + x) * 4 + 2] = rgb[2];
          raw[(row + x) * 4 + 3] = 255; // No transparency hardcoded :/
        }
      }

      return raw;
    }

  });

  // Genev.Agent
  //------------

  //
  // TODO: description
  //

  var agentDefaults = {
      x: 0,
      y: 0,
      dir: 0,
      delay: 0,
      delayInt: 0,
      stop: 1,
      stopInt: 99999999,
      gen: 0,
      genTime1: 0,
      genTime2: 0,
      index: 1,
      options: {
        width: 100,
        height: 100,
        wrapAround: true,
        maxAgents: 3
      }
  };

  var Agent = Genev.Agent = function( attributes ){

    attributes = attributes || {};
    var options = _.clone(agentDefaults.options);
    _.extend(options, attributes.options);
    attributes.options = options;
    _.extend(this, this._randomizedAttributes(), _.omit(agentDefaults, 'options'), attributes);
    this.genome = (attributes.genome) ? ( (attributes.genome instanceof Genome) ? attributes.genome : new Genome(attributes.genome)) : new Genome();
    _.extend(this, this._setPositionOnGrid());
    this._originalAttributes = _.clone(_.pick(this, ['dir', 'gen', 'genTime1', 'genTime2', 'delay', 'stop', 'options']));
    this.initialize.apply(this, arguments);

    return this;
  };

  _.extend(Agent.prototype, {

    initialize: noop,

    setIndex: function(index){
      this.index = index;
      _.extend(this, this._setPositionOnGrid());
      return this;
    },

    mutate: function( prob ) {
      var newDir = (Math.random() < prob) ? Math.floor(Math.random() * 9) : this._originalAttributes.dir,
          newGen = (Math.random() < prob) ? (utils.ringify(this.gen + utils.gaussRandom() * 0.2)) : this.gen,
          newGenTime1 = (Math.random() < prob) ? (utils.ringify(this.genTime1 + utils.gaussRandom() * 0.2)) : this.genTime1,
          newGenTime2 = (Math.random() < prob) ? (utils.ringify(this.genTime2 + utils.gaussRandom() * 0.2)) : this.genTime2,
          newDelay = (Math.random() < prob) ? utils.ringify(this.delay + utils.gaussRandom() * 0.1) : this.delay,
          newStop = (Math.random() < prob) ? utils.ringify(this.stop + utils.gaussRandom() * 0.1) : this.stop,
          temp;

      if(newStop < newDelay){
        temp = newDelay;
        newDelay = newStop;
        newStop = temp;
      }

      return new Agent({
        options: this.options,
        genome: this.genome.mutate( prob ),
        dir: newDir,
        gen: newGen,
        genTime1: newGenTime1,
        genTime2: newGenTime2,
        delay: newDelay,
        stop: newStop
      });
    },

    crossover: function( agent ) {
      var prob = 0.5,
          newGen = (Math.random() < prob) ? agent.gen : this.gen,
          newGenTime1 = (Math.random() < prob) ? agent.genTime1 : this.genTime1,
          newGenTime2 = (Math.random() < prob) ? agent.genTime2 : this.genTime2,
          newDelay = (Math.random() < prob) ? agent.delay : this.delay,
          newStop = (Math.random() < prob) ? agent.stop : this.stop;

      return new Agent({
        options: this.options,
        genome: this.genome.crossover( agent.genome ),
        dir: this._originalAttributes.dir,
        gen: newGen,
        genTime1: newGenTime1,
        genTime2: newGenTime2,
        delay: newDelay,
        stop: newStop
      });
    },

    clone: function() {
      return new Agent({
          options: this.options,
          dir: this._originalAttributes.dir,
          gen: this.gen,
          genTime1: this.genTime1,
          genTime2: this.genTime2,
          delay: this.delay,
          stop: this.stop,
          genome: this.genome.clone()
      });
    },

    step: function( individual, time ) {
      if( time < this.delayInt || time > this.stopInt) {
        return;
      }
      var inputs = this._collectInputs( individual, time ),
        response = this.genome.evaluate( inputs ),
        nextPos = this._getNextPosition( this._floatToDir( response[3] ) ),
        changing =  {
                nextPos: _.partial( _.bind(
                    function(pos){
                      this.x = pos.x;
                      this.y = pos.y;
                      return pos;
                    }, this),
                  nextPos),
                currPos: _.partial( function( agent ){
                      return {x: agent.x, y: agent.y}
                    }, this),
                h: response[0],
                s: response[1],
                b: response[2]
              };

      return changing;
    },

    _collectInputs: function(individual, time) {
      var bMean = 0.0, bMax = 0.0, bMin = 1.0,
        sMean = 0.0,
        hMean = 0.0,
        maxTimeLoop1 = 1000 * this.genTime1,
        maxTimeLoop1 = (maxTimeLoop1 < 1) ? 1 : maxTimeLoop1,
        maxTimeLoop2 = 1000 * this.genTime2,
        maxTimeLoop2 = (maxTimeLoop2 < 1) ? 1 : maxTimeLoop2,
        loopTime1 = time % maxTimeLoop1 / maxTimeLoop1,
        loopTime2 = time % maxTimeLoop2 / maxTimeLoop2,
        dirWhiteWithBlackNbh = -1.0,
        dirBlackWithWhiteNbh = -1.0,
        dRandBright = -1.0,
        dRandDark = -1.0,
        dirWhiteWithBlackNbh2 = 0.0,
        dirBlackWithWhiteNbh2 = 0.0,
        rand = Math.random(),
        bCurr = individual.b[this.x][this.y],
        sCurr = individual.s[this.x][this.y],
        hCurr = individual.h[this.x][this.y],
        oppDir = this._inverseDirection(this.dir),
        dP = this._dirToFloat(oppDir),
        prevPos = this._getNextPosition(oppDir),
        bPrev = individual.b[prevPos.x][prevPos.y],
        sPrev = individual.s[prevPos.x][prevPos.y],
        hPrev = individual.h[prevPos.x][prevPos.y],
        dirBMax = 0,
        dirBMin = 0,
        maxDiff = -1.0,
        dirMaxDiff = 0,
        nbPos, hVal, sVal, bVal, currDiff, dBMax, dBMin, dMaxDiff, threshNbhd = new Array(9), die1, die2, n1, n2;

      for (var i = 0; i < 9; ++i) {
        nbPos = this._getNextPosition(i);
        hVal = individual.h[nbPos.x][nbPos.y];
        sVal = individual.s[nbPos.x][nbPos.y];
        bVal = individual.b[nbPos.x][nbPos.y];

        hMean += hVal;
        sMean += sVal;
        bMean += bVal;

        currDiff = Math.pow(hVal - bCurr, 2) + Math.pow(sVal - sCurr, 2) + Math.pow(bVal - bCurr, 2);

        if(currDiff > maxDiff){
          maxDiff = currDiff;
          dirMaxDiff = i;
        }
        if ( bVal > bMax ) {
          bMax = bVal;
          dirBMax = i;
        }
        if ( bVal < bMin ) {
          bMin = bVal;
          dirBMin = i;
        }
      }

      bMean /= 9.0;
      sMean /= 9.0;
      hMean /= 9.0;
      dBMax = this._dirToFloat(dirBMax);
      dBMin = this._dirToFloat(dirBMin);
      dMaxDiff = this._dirToFloat(dirMaxDiff);

      for (var i = 0; i < 8; ++i) {
        nbPos = this._getNextPosition(i);
        bVal = individual.b[nbPos.x][nbPos.y];
        if(bVal >= bMean) {
          threshNbhd[i] = true;
        }
      }

      for (var i = 0; i < 8; ++i) {
        die1 = Math.random();
        die2 = Math.random();
        n1 = i - 1;
        n1 = (n1 < 1) ? 7 : n1;
        n2 = i + 1;
        n2 = (n2 >= 8) ? 1 : n2;

        if (threshNbhd[i]) {
          if ( dRandBright < 0.0 || die1 < 0.3 ) {
            dRandBright = this._dirToFloat(i);
          }
          if ((threshNbhd[n1] === 0|| threshNbhd[n2] === 0) && (dirBlackWithWhiteNbh < 0.0 || die2 < 0.3)) {
            dirBlackWithWhiteNbh = this._dirToFloat(i);
            dirBlackWithWhiteNbh2 = dirBlackWithWhiteNbh;
          }
        } else {
          if (dRandDark < 0.0 || die1 < 0.3) {
            dRandDark = this._dirToFloat(i);
          }
          if((threshNbhd[n1] !== 0 || threshNbhd[n2] !== 0) && (dirWhiteWithBlackNbh < 0.0 || die2 < 0.3)) {
            dirWhiteWithBlackNbh = this._dirToFloat(i);
            dirWhiteWithBlackNbh2 = dirWhiteWithBlackNbh;
          }
        }
      }

      dRandBright = (dRandBright < 0.0) ? this.gen : dRandBright;
      dRandDark = (dRandDark < 0.0) ? this.gen : dRandDark;
      dirWhiteWithBlackNbh = (dirWhiteWithBlackNbh < 0) ? this.gen : dirWhiteWithBlackNbh;
      dirBlackWithWhiteNbh = (dirBlackWithWhiteNbh < 0) ? this.gen : dirBlackWithWhiteNbh;

      return [ rand, bCurr, bMean, bMax, bMin, dBMin, bPrev, sCurr, sMean, sPrev, hCurr, hMean, hPrev, dP, dMaxDiff, dRandBright, dRandDark, this.gen, loopTime1, loopTime2, dirWhiteWithBlackNbh, dirBlackWithWhiteNbh, individual.startH, individual.startS, individual.startB, dirWhiteWithBlackNbh2, dirBlackWithWhiteNbh2 ];
    },

    toJSON: function() {
      return _.pick(
        this,
        'dir',
        'gen',
        'genTime1',
        'genTime2',
        'delay',
        'stop',
        'genome',
        'options'
      );
    },
    fromJSON: function( string ) {
      var obj = JSON.parse(string);
      return new Agent(obj);
    },
    _randomizedAttributes: function( die ) {
      die = die || Math.random();
      var dir = Math.floor(Math.random() * 9),
        gen = Math.random(),
        genTime1 = Math.random(),
        genTime2 = Math.random(),
        delay = (Math.random() < 0.33) ? 0 : Math.random() * 0.33,
        stop = (Math.random() < 0.33) ? 1 : (Math.random() * 0.66) + 0.33;

      if (die < 0.2) {
        delay = 0;
        stop = Math.random() * 0.5;
      } else if (die < 0.4) {
        delay = (Math.random() * 0.4000000059604645) + 0.3;
        stop = 1;
      }

      return {
        dir: dir,
        gen: gen,
        genTime1: genTime1,
        genTime2: genTime2,
        delay: delay,
        stop: stop
      }
    },

    _setPositionOnGrid: function() {
      var maxTime = this.options.width * this.options.height * 2,
        delayInt = Math.round(maxTime * this.delay),
        stopInt = Math.round(maxTime * this.stop),
        root =  Math.sqrt(this.options.maxAgents),
        gridX = ((this.index / root) * (this.options.width / root)) + this.options.width * 0.1,
        gridY = ((this.index % root) * (this.options.height / root)) + this.options.height * 0.1,
        gridX = (gridX >= this.options.width) ? this.options.width - (this.options.width * 0.2) : gridX,
        gridY = (gridY >= this.options.height) ? this.options.height - (this.options.height * 0.2) : gridY,
        x = Math.floor(gridX),
        y = Math.floor(gridY);
      return {
        delayInt: delayInt,
        stopInt: stopInt,
        x: x,
        y: y
      };
    },

    _getNextPosition: function( dir ) {
      var pos = [this.x, this.y],
        wrapAround = this.options.wrapAround,
        width = this.options.width,
        height = this.options.height;

      switch(dir){
        case 1:
          pos[0] -= 1;
          break;
        case 2:
          pos[0] -= 1;
          pos[1] -= 1;
          break;
        case 3:
          pos[1] -= 1;
          break;
        case 4:
          pos[0] += 1;
          pos[1] -= 1;
          break;
        case 5:
          pos[0] += 1;
          break;
        case 6:
          pos[0] += 1;
          pos[1] += 1;
          break;
        case 7:
          pos[1] += 1;
          break;
        case 8:
          pos[0] -= 1;
          pos[1] += 1;
          break;
      }

      pos[0] = (pos[0] < 0) ? ((wrapAround) ? width - 1 : 0) : pos[0];
      pos[0] = (pos[0] >= width) ? ((!wrapAround) ? width - 1 : 0) : pos[0];
      pos[1] = (pos[1] < 0) ? ((wrapAround) ? height - 1 : 0) : pos[1];
      pos[1] = (pos[1] >= height) ? ((!wrapAround) ? height - 1 : 0) : pos[1];

      return {x: pos[0], y: pos[1]};
    },

    _inverseDirection: function( dir ) {
      var newDir;
        if (dir === 0) {
          return 0;
        }
        newDir = (dir + 4) % 8;
        if (newDir === 0) {
          newDir = 8;
        }
       return newDir;
    },

    _dirToFloat: function( dir ) {
      return dir / 9.0;
    },

    _floatToDir: function( val ){
      return parseInt(val * 9.0);
    }

  });

  // Genev.Genome
  //-------------

  //
  // TODO: description
  //

  var attrNames = ['inputsH', 'inputsS', 'inputsB', 'inputsDir', 'nodesH', 'nodesS', 'nodesB', 'nodesDir', 'constArr'],
      ops = {
        add: function( x, y ) {
          return x + y;
        },
        sub: function( x, y) {
          return x - y;
        },
        mult : function( x, y ) {
          return x * y;
        },
        ind : function( x, y, i ) { // TODO: find a better way to get value from constArr
          return this.constArr[i];
        },
        min : function( x, y ) {
          return (x < y) ? x : y;
        },
        max : function( x, y ) {
          return (x > y) ? x : y;
        },
        sin : function( x ) {
          return Math.sin( x );
        },
        atan : function( x ) {
          return Math.atan( x );
        },
        id : function( x ) {
          return x;
        },
        mean : function( x, y ) {
          return x + y / 2;
        },
        realmean : function( x, y ) {
          return (x + y) / 2;
        },
        div : function( x, y ) {
          return (y < Number.MIN_VALUE) ? x : Math.round(x / y);
        },
        incdec : function( x, y ){
          return (y > 0.5) ? (x + 0.125) : (x - 0.125);
        },
        inv : function( x ) {
          return 1 - x;
        }
      },
      genomeDefaults = {
        options: {
          agentTreeDepth: 3,
          agentInputs: 27, // Agents collected inputs length - IMPORTANT: need to ensure it correct lenght otherwise we fail
          biasHTree: false,
          biasSTree: false,
          biasBTree: false,
          biasNoChange: false
        }
      };


  var Genome = Genev.Genome = function( attributes ){

    attributes = attributes || {};
    var options = _.clone(genomeDefaults.options);
    _.extend(options, attributes.options);
    attributes.options = options;
    _.extend(this, attributes);
    this.numTotalNodes = this.numTotalNodes || Math.floor(Math.pow(2, this.options.agentTreeDepth + 1) - 1);
    this.numInputNodes = this.numInputNodes || Math.floor(Math.pow(2, this.options.agentTreeDepth));
    this.numProcessNodes = this.numProcessNodes || this.numTotalNodes - this.numInputNodes;

    this.inputsH = this.inputsH || _.invoke(_.range(this.numInputNodes), _.bind(this._getRandomInput, this), this.options.biasNoChange, 0, true);
    this.inputsS = this.inputsS || _.invoke(_.range(this.numInputNodes), _.bind(this._getRandomInput, this), this.options.biasNoChange, 1, true);
    this.inputsB = this.inputsB || _.invoke(_.range(this.numInputNodes), _.bind(this._getRandomInput, this), this.options.biasNoChange, 2, true);
    this.inputsDir = this.inputsDir || _.invoke(_.range(this.numInputNodes), _.bind(this._getRandomInput, this), false, 0, true);
    this.nodesH = this.nodesH || _.invoke(_.range(this.numProcessNodes), this._getRandomFunction, this.options.biasNoChange);
    this.nodesS = this.nodesS || _.invoke(_.range(this.numProcessNodes), this._getRandomFunction, this.options.biasNoChange);
    this.nodesB = this.nodesB || _.invoke(_.range(this.numProcessNodes), this._getRandomFunction, this.options.biasNoChange);
    this.nodesDir = this.nodesDir || _.invoke(_.range(this.numProcessNodes), this._getRandomFunction, false);
    this.constArr = this.constArr || _.map(_.range(this.numProcessNodes), Math.random);

    if(this.options.biasHTree || this.options.biasSTree || this.options.biasBTree && !attributes.constArr) {
      this.constArr[0] = Math.random() * 0.4 + 0.3;
    }
    if(this.options.biasSTree && !attributes.nodesS) {
      this.nodesS[0] = 'ind';
    }
    if(this.options.biasBTree && !attributes.nodesB) {
      this.nodesB[0] = 'ind';
    }

    this.initialize.apply(this, arguments);
  };

  _.extend(Genome.prototype, {

    initialize: noop,

    clone: function() {
      return new Genome(
        {
          inputsH: this.inputsH.slice(0),
          inputsS: this.inputsS.slice(0),
          inputsB: this.inputsB.slice(0),
          inputsDir: this.inputsDir.slice(0),
          nodesH: this.nodesH.slice(0),
          nodesS: this.nodesS.slice(0),
          nodesB: this.nodesB.slice(0),
          nodesDir: this.nodesDir.slice(0),
          constArr: this.constArr.slice(0),
          numTotalNodes: this.numTotalNodes,
          numInputNodes: this.numInputNodes,
          numProcessNodes: this.numProcessNodes,
          options: _.clone(this.options)
        }
      );
    },
    mutate: function( prob ) {
      var mutant = this.clone();
      mutant.inputsH = _.map(mutant.inputsH, function(val){ return utils.probFn(val, prob, this._getRandomInput, ops.id, false, 0, false);});
      mutant.inputsS = _.map(mutant.inputsS, function(val){ return utils.probFn(val, prob, this._getRandomInput, ops.id, false, 1, false);});
      mutant.inputsB = _.map(mutant.inputsB, function(val){ return utils.probFn(val, prob, this._getRandomInput, ops.id, false, 2, false);});
      mutant.inputsDir = _.map(mutant.inputsDir, function(val){ return utils.probFn(val, prob, this._getRandomInput, ops.id, false, 0, false);});
      mutant.nodesH = _.map(mutant.nodesH, function(val){ return utils.probFn(val, prob, this._getRandomFunction, ops.id, false);});
      mutant.nodesS = _.map(mutant.nodesS, function(val){ return utils.probFn(val, prob, this._getRandomFunction, ops.id, false);});
      mutant.nodesB = _.map(mutant.nodesB, function(val){ return utils.probFn(val, prob, this._getRandomFunction, ops.id, false);});
      mutant.nodesDir = _.map(mutant.nodesDir, function(val){ return utils.probFn(val, prob, function(){ return Math.floor(Math.random() * ops.length);}, ops.id);});
      mutant.constArr = _.map(mutant.constArr, function(val){ return utils.probFn(val, prob, function( val ){ return utils.limit(val + utils.gaussRandom() * 0.2);}, ops.id);});
      return mutant;
    },
    crossover: function( genome ) {
      if (!(genome instanceof Genome)){
        throw new TypeError("Genev.js: to crossover a genome, another genome must be provided!");
      } else {
        var prob = 0.5,
            cross,
            bigger =   _.pick( ((this.numProcessNodes > genome.numProcessNodes) ? this : genome), 'inputsH', 'inputsS', 'inputsB', 'inputsDir', 'nodesH', 'nodesS', 'nodesB', 'nodesDir', 'constArr'),
            newAttr = _.map(
              bigger,
              function(val, key, list){
                cross = _.map(
                  val,
                  function(v, index){
                    return (Math.random() < prob) ? (genome[key][index] || v) : (v || genome[key][index]);
                  }
                );
                return cross;
              }
            ),
            newOptions = {};
            _.each(
              bigger.options,
              function(val, key, obj){
                newOptions[key] = val;
              }
            );
        return new Genome(
          {
            inputsH: newAttr[0],
            inputsS: newAttr[1],
            inputsB: newAttr[2],
            inputsDir: newAttr[3],
            nodesH: newAttr[4],
            nodesS: newAttr[5],
            nodesB: newAttr[6],
            nodesDir: newAttr[7],
            constArr: newAttr[8],
            numTotalNodes: bigger.numTotalNodes,
            numInputNodes: bigger.numInputNodes,
            numProcessNodes: bigger.numProcessNodes,
            options: newOptions
          }
        );
      }
    },
    evaluate: function( inputs ) {

      var hVals = new Float32Array(this.numTotalNodes),
          sVals = new Float32Array(this.numTotalNodes),
          bVals = new Float32Array(this.numTotalNodes),
          dirVals = new Float32Array(this.numTotalNodes),
          child1Index,
          child2Index;

      for( var i = this.numProcessNodes; i < this.numTotalNodes - 1 ; i++ ) {
        hVals[i] = inputs[this.inputsH[ i - this.numProcessNodes ]] || 0;
        sVals[i] = inputs[this.inputsS[ i - this.numProcessNodes ]] || 0;
        bVals[i] = inputs[this.inputsB[ i - this.numProcessNodes ]] || 0;
        dirVals[i] = inputs[this.inputsDir[ i - this.numProcessNodes ]] || 0;

      }

      for( var i = this.numProcessNodes - 1; i >= 0; i-- ) {
        child1Index = i * 2 + 1;
        child2Index = i * 2 + 2;
        hVals[i] = utils.ringify(ops[this.nodesH[i]].apply(this, [hVals[child1Index], hVals[child2Index], i]));
        sVals[i] = utils.ringify(ops[this.nodesS[i]].apply(this, [sVals[child1Index], sVals[child2Index], i]));
        bVals[i] = utils.ringify(ops[this.nodesB[i]].apply(this, [bVals[child1Index], bVals[child2Index], i]));
        dirVals[i] = utils.ringify(ops[this.nodesDir[i]].apply(this, [dirVals[child1Index], dirVals[child2Index], i]));
      }
      return [hVals[0], sVals[0], bVals[0], dirVals[0]];
    },

    toJSON: function() {
      return _.pick(
          this,
          'inputsH',
          'inputsS',
          'inputsB',
          'inputsDir',
          'nodesH',
          'nodesS',
          'nodesB',
          'nodesDir',
          'constArr',
          'numTotalNodes',
          'numInputNodes',
          'numProcessNodes',
          'options'
        );
    },
    fromJSON: function( string ) {
      var obj = JSON.parse(string);
      return new Genome(obj);
    },
    _getRandomInput: function( biasNoChange, HSorB, init ) {
      var die = Math.random();
      if( biasNoChange ) {
        if( HSorB === 0 ) {
          if( die < 0.33 ) {
            return 11;
          } else if( die < 0.66 ) {
            return 12;
          } else {
            return 13;
          }
        }
        if( HSorB === 1 ) {
          if( die < 0.33 ) {
            return 8;
          } else if (die < 0.66) {
            return 9;
          } else {
            return 10;
          }
        }
        if ( die < 0.2 ) {
          return 1;
        } else if ( die < 0.4) {
          return 2;
        } else if ( die < 0.6 ) {
          return 3;
        } else if ( die < 0.8 ) {
          return 5;
        } else {
          return 7;
        }
      } else if( init ) {
        return Math.floor( Math.random() * (this.options.agentInputs - 1) + 1 );
      } else {
        return Math.random() * this.options.agentInputs;
      }
    },
    _getRandomFunction: function( biasNoChange ) {
      var die = Math.random();
      if( biasNoChange ) {
        if ( die < 0.01 ){
          return 'add';
        } else if( die < 0.02 ) {
          return 'sub';
        } else if( die < 0.03 ) {
          return 'mult';
        } else if( die < 0.04 ) {
          return 'ind';
        } else if ( die < 0.05 ) {
          return 'max';
        } else if ( die < 0.06 ) {
          return 'min';
        } else if ( die < 0.8 ) {
          return 'div';
        } else if ( die < 0.85 ) {
          return 'id';
        } else if ( die < 0.88 ) {
          return 'realmean';
        } else if ( die < 0.9 ){
          return 'atan';
        } else if ( die < 0.98 ) {
          return 'incdec';
        } else if ( die < 0.99 ) {
          return 'sin';
        } else {
          return 'inv';
        }
      } else {
        if ( die < 0.05 ){
          return 'add';
        } else if( die < 0.1 ) {
          return 'sub';
        } else if( die < 0.15 ) {
          return 'mult';
        } else if( die < 0.25 ) {
          return 'ind';
        } else if ( die < 0.3 ) {
          return 'max';
        } else if ( die < 0.35 ) {
          return 'min';
        } else if ( die < 0.5 ){
          return 'atan';
        } else if ( die < 0.6 ) {
          return 'id';
        } else if ( die < 0.82 ) {
          return 'realmean';
        } else if ( die < 0.85 ) {
          return 'div';
        } else if ( die < 0.95 ) {
          return 'incdec';
        } else if ( die < 0.98 ) {
          return 'sin';
        } else {
          return 'inv';
        }
      }
    }
  });

  // Helpers
  // -------

  //
  // extend borrowed from Backbone
  //
  var extend = function(protoProps, staticProps) {
    var parent = this;
    var child;

    // The constructor function for the new subclass is either defined by you
    // (the "constructor" property in your `extend` definition), or defaulted
    // by us to simply call the parent's constructor.
    if (protoProps && _.has(protoProps, 'constructor')) {
      child = protoProps.constructor;
    } else {
      child = function(){ return parent.apply(this, arguments); };
    }

    // Add static properties to the constructor function, if supplied.
    _.extend(child, parent, staticProps);

    // Set the prototype chain to inherit from `parent`, without calling
    // `parent`'s constructor function.
    var Surrogate = function(){ this.constructor = child; };
    Surrogate.prototype = parent.prototype;
    child.prototype = new Surrogate;

    // Add prototype properties (instance properties) to the subclass,
    // if supplied.
    if (protoProps) _.extend(child.prototype, protoProps);

    // Set a convenience property in case the parent's prototype is needed
    // later.
    child.__super__ = parent.prototype;

    return child;
  };

  // Set up inheritance chain for individual, agent and genome
  Individual.extend = Agent.extend = Genome.extend = extend;

  return Genev;

}));