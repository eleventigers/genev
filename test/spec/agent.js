'use strict';
describe('Agent', function () {
    var agent = new Genev.Agent();
    it('should have a Genome attached', function (done) {
        agent.genome.should.be.an('object');
        done();
    });
    it('decoding and encoding to Genome string should be produce exact copy', function (done){
        var encoded = agent.toGenomeString(),
            decoded = new Genev.Agent(encoded),
            val;
        for(var key in agent.attributes){
            val = decoded.key;
            if(typeof val === "object"){
                expect(_.isEqual(val, agent.key)).to.equal(true);
            } else {
                expect(val).to.equal(agent.key);
            }
        }
        done();
    });
    it('extended should have a correct prototype', function(done){
        var extended = Genev.Agent.extend({});

        extended.prototype.step.should.be.a('function');
        expect(extended.prototype.constructor.__super__).to.equal(agent.__proto__);

       done();
    });
});