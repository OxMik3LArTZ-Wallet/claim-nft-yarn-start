import utils from '../substrateUtils';
import { getClaimedAssets } from './txHandler';
import { transferBalanceAndFees, transferAll } from './txCalls';
import config from '../../config';

const feeMultiplierValue = config.ADDED_FEE_MULTIPLIER;

const balancePalletGiftProvider = {
  createGift: (api, interimAccount, senderAccount, gift) => {
    const interimAddress = utils.getAccountAddress(interimAccount);
    return transferBalanceAndFees(
      api,
      senderAccount,
      interimAddress,
      gift?.amount,
      feeMultiplierValue, // fee multiplier of 1x
      'gift::create'
    );
  },
  claimGift: async (api, interimAccount, recipientAccount) => {
    const recepientAddress = utils.getAccountAddress(recipientAccount);
    // verify the gift account holds any balances (gifts) before starting to transfer them:
    const fromAddress = utils.getAccountAddress(interimAccount);
    const balance = (await api.query.system.account(fromAddress))?.data;
    console.log(balance?.free.toHuman());
    if (!balance?.free || balance?.free?.eqn(0)) {
      throw new Error('The gift secret does not hold any gifts. You might have entered the wrong secret or the gift might have been already claimed.');
    }
    const events = await transferAll(api, interimAccount, recepientAddress, 'gift::claim');
    const claimed = getClaimedAssets(api, events);
    return claimed;
  },
  removeGift: async (api, interimAccount, senderAccount) => {
    const senderAddress = utils.getAccountAddress(senderAccount);
    // verify the gift account holds any balances (gifts) before starting to transfer them:
    const fromAddress = utils.getAccountAddress(interimAccount);
    const balance = (await api.query.system.account(fromAddress))?.data;
    console.log(balance?.free.toHuman());
    if (!balance?.free || balance?.free?.eqn(0)) {
      throw new Error('The gift secret does not hold any gifts. The gift might have been already claimed or removed.');
    }
    return transferAll(api, interimAccount, senderAddress, 'gift::remove');
  },
  getGiftFeeMultiplier: () => {
    // tx fees are multiplied by this multiplier and added to the gift value when the gift is generated.
    // the gift value is calculated as : gift_amount + feeMultiplierValue*(txfee)
    // The added fee amount will cover the fees for the tranaction from the interim gif account to the recipient account during claim process
    // , plus  maybe some more transactions after the claim that are covered.
    return feeMultiplierValue;
  }
};

export default balancePalletGiftProvider;
