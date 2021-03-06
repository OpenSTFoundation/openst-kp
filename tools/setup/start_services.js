'use strict';
/**
 * Start All openST Platform Services
 *
 * @module tools/setup/start_services.js
 */

const shellAsyncCmd = require('node-cmd');

// load shelljs and disable output
let shell = require('shelljs');
shell.config.silent = true;

const rootPrefix = '../..',
  setupHelper = require(rootPrefix + '/tools/setup/helper'),
  InstanceComposer = require(rootPrefix + '/instance_composer'),
  logger = require(rootPrefix + '/helpers/custom_console_logger'),
  StartDynamo = require(rootPrefix + '/lib/start_dynamo');

const args = process.argv,
  configStrategyFilePath = args[2];

require(rootPrefix + '/services/utils/platform_status');

const configStrategy = configStrategyFilePath
    ? require(configStrategyFilePath)
    : require(setupHelper.configStrategyFilePath()),
  instanceComposer = new InstanceComposer(configStrategy),
  PlatformStatusKlass = instanceComposer.getPlatformStatusService();

/**
 * Constructor for start services
 *
 * @constructor
 */
const StartServicesKlass = function() {};

StartServicesKlass.prototype = {
  /**
   * Start all platform services
   */
  perform: async function() {
    const oThis = this,
      servicesList = [];

    let cmd = "ps aux | grep dynamo | grep java | grep -v grep | tr -s ' ' | cut -d ' ' -f2";
    let processId = shell.exec(cmd).stdout;

    if (processId === '') {
      // Start Dynamo DB in openST env
      let startDynamo = new StartDynamo();
      await startDynamo.perform();
    }

    // Start Value Chain
    logger.step('** Start value chain');
    cmd = 'sh ' + setupHelper.utilityChainBinFilesFolder() + '/run-value.sh';
    servicesList.push(cmd);
    oThis._asyncCommand(cmd);

    // Start Utility Chain
    logger.step('** Start utility chain');
    cmd = 'sh ' + setupHelper.utilityChainBinFilesFolder() + '/run-utility.sh';
    servicesList.push(cmd);
    oThis._asyncCommand(cmd);

    // Wait for 5 seconds for geth to come up
    const sleep = function(ms) {
      return new Promise(function(resolve) {
        setTimeout(resolve, ms);
      });
    };
    await sleep(5000);

    // Check geths are up and running
    logger.step('** Check chains are up and responding');
    const statusObj = new PlatformStatusKlass(),
      servicesResponse = await statusObj.perform();
    if (servicesResponse.isFailure()) {
      logger.error('* Error ', servicesResponse);
      process.exit(1);
    } else {
      logger.info(
        '* Value Chain:',
        servicesResponse.data.chain.value,
        'Utility Chain:',
        servicesResponse.data.chain.utility
      );
    }

    // Start intercom processes in openST env
    logger.step('** Start stake and mint inter-communication process');
    cmd = 'sh ' + setupHelper.utilityChainBinFilesFolder() + '/run-stake_and_mint.sh';
    servicesList.push(cmd);
    oThis._asyncCommand(cmd);

    logger.step('** Start register branded token inter-communication process');
    cmd = 'sh ' + setupHelper.utilityChainBinFilesFolder() + '/run-register_branded_token.sh';
    servicesList.push(cmd);
    oThis._asyncCommand(cmd);

    // Start intercom processes in OST env
    logger.step('** Start stake and mint processor');
    cmd = 'sh ' + setupHelper.utilityChainBinFilesFolder() + '/run-stake_and_mint_processor.sh';
    servicesList.push(cmd);
    oThis._asyncCommand(cmd);

    logger.step('** Start Stake hunter inter-communication process');
    cmd = 'sh ' + setupHelper.binFolderAbsolutePath() + '/run-stake_hunter.sh';
    servicesList.push(cmd);
    oThis._asyncCommand(cmd);

    logger.win(
      '\n** Congratulation! All services are up and running. \n' +
        'NOTE: We will keep monitoring the services, and notify you if any service stops.'
    );

    // Check all services are running
    oThis._uptime(servicesList);
  },

  /**
   * Run async command
   *
   * @params {string} cmd - command to start the service
   * @private
   */
  _asyncCommand: function(cmd) {
    const oThis = this;
    logger.info(cmd);
    shellAsyncCmd.run(cmd);
  },

  /**
   * Check if all services are up and running
   *
   * @params {array} cmds - Array of all running service commands
   * @private
   */
  _uptime: function(cmds) {
    setInterval(function() {
      for (let i = 0; i < cmds.length; i++) {
        let processID = (shell.exec("ps -ef | grep '" + cmds[i] + "' | grep -v grep | awk '{print $2}'") || {}).stdout;
        if (processID === '') {
          logger.error('* Process stopped:', cmds[i], ' Please restart the services.');
        }
      }
    }, 5000);
  }
};

// Start the platform services
logger.error(Array(30).join('='));
logger.error(
  'Note: For scalability and security reasons, this script should only be used in ' +
    setupHelper.allowedEnvironment().join(' and ') +
    ' environments.'
);
logger.error(Array(30).join('='));

const services = new StartServicesKlass();
services.perform();
