'use strict';

/**
 * Transfer Simple Token Prime
 *
 * @module services/transaction/transfer/simple_token_prime
 */

const rootPrefix = '../../..',
  InstanceComposer = require(rootPrefix + '/instance_composer'),
  logger = require(rootPrefix + '/helpers/custom_console_logger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  basicHelper = require(rootPrefix + '/helpers/basic_helper');

require(rootPrefix + '/config/core_addresses');
require(rootPrefix + '/lib/contract_interact/st_prime');

/**
 * Transfer Simple Token Prime Service
 *
 * @param {object} params -
 * @param {string} params.sender_address - Sender address
 * @param {string} params.sender_passphrase - Sender passphrase
 * @param {string} [params.sender_name] - Sender name where only platform has address and passphrase
 * @param {string} params.recipient_address - Recipient address
 * @param {string} [params.recipient_name] - Recipient name name where only platform has address and passphrase
 * @param {number} params.amount_in_wei - Amount (in wei) to transfer
 * @param {object} params.options -
 * @param {string} params.options.tag - extra param which gets logged for transaction as transaction type
 * @param {boolean} [params.options.returnType] - Desired return type. possible values: uuid, txHash, txReceipt. Default: txHash
 *
 * @constructor
 */
const TransferSimpleTokenPrimeKlass = function(params) {
  const oThis = this;

  params = params || {};
  oThis.senderAddress = params.sender_address;
  oThis.senderPassphrase = params.sender_passphrase;
  oThis.senderName = params.sender_name;
  oThis.recipientAddress = params.recipient_address;
  oThis.recipientName = params.recipient_name;
  oThis.amountInWei = params.amount_in_wei;
  oThis.tag = (params.options || {}).tag;
  oThis.returnType = (params.options || {}).returnType || 'txHash';
};

TransferSimpleTokenPrimeKlass.prototype = {
  /**
   * Perform
   *
   * @return {Promise}
   */
  perform: function() {
    const oThis = this;

    return oThis.asyncPerform().catch(function(error) {
      if (responseHelper.isCustomResult(error)) {
        return error;
      } else {
        logger.error('openst-platform::services/transaction/transfer/simple_token_prime.js::perform::catch');
        logger.error(error);
        return responseHelper.error({
          internal_error_identifier: 's_t_t_stp_5',
          api_error_identifier: 'something_went_wrong',
          debug_options: {}
        });
      }
    });
  },

  /**
   * asyncPerform
   *
   * @return {promise<result>} - returns a promise which resolves to an object of kind Result
   */
  asyncPerform: async function() {
    const oThis = this,
      coreAddresses = oThis.ic().getCoreAddresses(),
      stPrimeContractAddress = coreAddresses.getAddressForContract('stPrime'),
      StPrimeKlass = oThis.ic().getStPrimeInteractClass(),
      stPrime = new StPrimeKlass(stPrimeContractAddress);

    // Get sender details by name
    if (oThis.senderName) {
      oThis.senderAddress = coreAddresses.getAddressForUser(oThis.senderName);
      oThis.senderPassphrase = coreAddresses.getPassphraseForUser(oThis.senderName);
    }
    // Get recipient details by name
    if (oThis.recipientName) {
      oThis.recipientAddress = coreAddresses.getAddressForUser(oThis.recipientName);
    }

    // Validations
    if (!basicHelper.isAddressValid(oThis.senderAddress) || !oThis.senderPassphrase) {
      let errObj = responseHelper.error({
        internal_error_identifier: 's_t_t_stp_1',
        api_error_identifier: 'invalid_address',
        error_config: basicHelper.fetchErrorConfig()
      });
      return Promise.resolve(errObj);
    }
    if (!basicHelper.isAddressValid(oThis.recipientAddress)) {
      let errObj = responseHelper.error({
        internal_error_identifier: 's_t_t_stp_2',
        api_error_identifier: 'invalid_address',
        error_config: basicHelper.fetchErrorConfig()
      });
      return Promise.resolve(errObj);
    }
    if (!basicHelper.isNonZeroWeiValid(oThis.amountInWei)) {
      let errObj = responseHelper.error({
        internal_error_identifier: 's_t_t_stp_3',
        api_error_identifier: 'invalid_amount',
        error_config: basicHelper.fetchErrorConfig()
      });
      return Promise.resolve(errObj);
    }
    if (!basicHelper.isTagValid(oThis.tag)) {
      let errObj = responseHelper.error({
        internal_error_identifier: 's_t_t_stp_4',
        api_error_identifier: 'invalid_transaction_tag',
        error_config: basicHelper.fetchErrorConfig()
      });
      return Promise.resolve(errObj);
    }

    // Format wei
    oThis.amountInWei = basicHelper.formatWeiToString(oThis.amountInWei);

    return stPrime.transfer(oThis.senderAddress, oThis.senderPassphrase, oThis.recipientAddress, oThis.amountInWei, {
      tag: oThis.tag,
      returnType: oThis.returnType
    });
  }
};

InstanceComposer.registerShadowableClass(TransferSimpleTokenPrimeKlass, 'getTransferSimpleTokenPrimeService');

module.exports = TransferSimpleTokenPrimeKlass;
