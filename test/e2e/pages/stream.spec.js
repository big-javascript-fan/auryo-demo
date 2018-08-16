import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import { harness } from "../_utils/_harness";

chai.should();
chai.use(chaiAsPromised);

harness("stream page", () => {
    it('should be first page', () => {
        return app.client
            .waitForExist('.auryo', 5000)
            .getText('.page-header h2')
            .should.eventually.equal("Stream")
    });

    it('should have tracks', () => {
        return app.client
            .waitForExist('.auryo', 5000)
            .getText('.page-header h2')
            .should.eventually.equal("Stream")
            .elements('.trackWrapper')
            .should.eventually.not.equal(0)
    });
})