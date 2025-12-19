import { createPublicClient, http, parseAbiItem, decodeEventLog, decodeAbiParameters } from "viem";
import { NextRequest, NextResponse } from "next/server";
import { getChainConfig, getRpcUrl } from "@/lib/chainlist";

// Event signature for TokenDeployed (updated with new ABI)
const TOKEN_DEPLOYED_EVENT = parseAbiItem(
  "event TokenDeployed(address indexed deployer, address indexed token, address router, address strategy, string name, string symbol, uint256 deploymentFee)"
);

// Alternative event signature found in Monad transactions (legacy)
const MONAD_TOKEN_DEPLOYED_EVENT = parseAbiItem(
  "event TokenDeployed(address indexed deployer, address indexed token, string name, string symbol)"
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { txHash, chainId } = body;

    if (!txHash || !chainId) {
      return NextResponse.json(
        { error: "Missing required fields: txHash and chainId" },
        { status: 400 }
      );
    }

    // Get chain configuration
    const chainConfig = getChainConfig(chainId);
    if (!chainConfig) {
      return NextResponse.json(
        { error: `Unsupported chain ID: ${chainId}` },
        { status: 400 }
      );
    }

    // Get RPC URL for the specific chain
    const rpcUrl = getRpcUrl(chainId);
    if (!rpcUrl) {
      return NextResponse.json(
        { error: `No RPC URL configured for chain ID: ${chainId}` },
        { status: 400 }
      );
    }

    // Create public client for the specific chain
    const publicClient = createPublicClient({
      transport: http(rpcUrl),
    });

    // Get transaction receipt with retry mechanism
    let receipt = null;
    let attempts = 0;
    const maxAttempts = 10;
    const baseDelay = 1000; // 1 second

    while (!receipt && attempts < maxAttempts) {
      try {
        receipt = await publicClient.getTransactionReceipt({
          hash: txHash as `0x${string}`,
        });
        
        if (receipt) {
          console.log(`Transaction receipt found after ${attempts + 1} attempts`);
          break;
        }
      } catch (error: any) {
        if (error.message?.includes('Transaction receipt') && error.message?.includes('could not be found')) {
          // Transaction not mined yet, wait and retry
          attempts++;
          if (attempts < maxAttempts) {
            const delay = baseDelay * Math.pow(2, attempts - 1); // Exponential backoff
            console.log(`Transaction not mined yet, waiting ${delay}ms before retry ${attempts}/${maxAttempts}`);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
        }
        throw error; // Re-throw if it's a different error
      }
    }

    if (!receipt) {
      return NextResponse.json(
        { error: `Transaction receipt not found after ${maxAttempts} attempts. Transaction may still be pending.` },
        { status: 408 } // Request Timeout
      );
    }

    if (!receipt.logs) {
      return NextResponse.json(
        { error: "Transaction receipt has no logs" },
        { status: 404 }
      );
    }

    // Parse logs to find TokenDeployed event
    console.log(`Processing ${receipt.logs.length} logs for transaction ${txHash}`);
    for (const log of receipt.logs) {
      console.log('Log topics:', log.topics);
      console.log('Log data:', log.data);
      try {
        // Try to decode the log as standard TokenDeployed event
        const decodedLog = decodeEventLog({
          abi: [TOKEN_DEPLOYED_EVENT],
          data: log.data,
          topics: log.topics,
        });

        if (decodedLog.eventName === "TokenDeployed") {
          const { deployer, token, router, strategy, name, symbol, deploymentFee } = decodedLog.args;

          return NextResponse.json({
            success: true,
            deployment: {
              deployer: deployer as string,
              token: token as string,
              router: router as string,
              strategy: strategy as string,
              name: name as string,
              symbol: symbol as string,
              deploymentFee: deploymentFee ? deploymentFee.toString() : "0",
              txHash,
              chainId,
              blockNumber: receipt.blockNumber.toString(),
              networkName: chainConfig.networkName,
            },
          });
        }
      } catch (error) {
        // Try alternative Monad event signature
        try {
          const decodedLog = decodeEventLog({
            abi: [MONAD_TOKEN_DEPLOYED_EVENT],
            data: log.data,
            topics: log.topics,
          });

          if (decodedLog.eventName === "TokenDeployed") {
            const { deployer, token, name, symbol } = decodedLog.args;

            let router = null, strategy = null, finalName = name, finalSymbol = symbol;

            // For Monad events, try to decode router and strategy from data
            try {
              console.log('Monad event data:', log.data);
              const decodedData = decodeAbiParameters(
                [
                  { name: 'router', type: 'address' },
                  { name: 'strategy', type: 'address' },
                  { name: 'name', type: 'string' },
                  { name: 'symbol', type: 'string' }
                ],
                log.data
              );
              console.log('Decoded Monad data:', decodedData);
              
              router = decodedData[0] as string;
              strategy = decodedData[1] as string;
              finalName = decodedData[2] as string;
              finalSymbol = decodedData[3] as string;
            } catch (e1) {
              // Fallback: try to decode just name and symbol
              try {
                const decodedNames = decodeAbiParameters(
                  [
                    { name: 'name', type: 'string' },
                    { name: 'symbol', type: 'string' }
                  ],
                  log.data
                );
                finalName = decodedNames[0] as string;
                finalSymbol = decodedNames[1] as string;
                
                // Try to get router and strategy from topics if available
                router = log.topics[3] ? '0x' + log.topics[3].slice(-40) : null;
                strategy = log.topics[4] ? '0x' + log.topics[4].slice(-40) : null;
              } catch (e2) {
                console.log('Using fallback values from event args');
                // Use the values from the event args as fallback
              }
            }

            return NextResponse.json({
              success: true,
              deployment: {
                deployer: deployer as string,
                token: token as string,
                router: router,
                strategy: strategy,
                name: finalName,
                symbol: finalSymbol,
                txHash,
                chainId,
                blockNumber: receipt.blockNumber.toString(),
                networkName: chainConfig.networkName,
              },
            });
          }
        } catch (monadError) {
          // Try to handle the specific Monad event signature we found
          // Event signature: 0x3c3712c9eea91b2beb997437f1ac5a550b84060d21034f8262139a2de4f77fb1
          if (log.topics[0] === '0x3c3712c9eea91b2beb997437f1ac5a550b84060d21034f8262139a2de4f77fb1') {
            try {
              // Extract deployer and token from topics, handling possible undefined values
              const deployer = log.topics?.[1] ? '0x' + log.topics[1].slice(-40) : undefined;
              const token = log.topics?.[2] ? '0x' + log.topics[2].slice(-40) : undefined;
              if (!deployer || !token) {
                throw new Error('Missing deployer or token topic');
              }

              let router = null, strategy = null, name = "", symbol = "";

              // Try to decode router, strategy, name, symbol from data (matching Node.js implementation)
              try {
                console.log('Fallback Monad event data:', log.data);
                const decodedData = decodeAbiParameters(
                  [
                    { name: 'router', type: 'address' },
                    { name: 'strategy', type: 'address' },
                    { name: 'name', type: 'string' },
                    { name: 'symbol', type: 'string' }
                  ],
                  log.data
                );
                console.log('Decoded fallback Monad data:', decodedData);
                
                router = decodedData[0] as string;
                strategy = decodedData[1] as string;
                name = decodedData[2] as string;
                symbol = decodedData[3] as string;
              } catch (e1) {
                // Fallback: try to decode just name and symbol
                try {
                  const decodedNames = decodeAbiParameters(
                    [
                      { name: 'name', type: 'string' },
                      { name: 'symbol', type: 'string' }
                    ],
                    log.data
                  );
                  name = decodedNames[0] as string;
                  symbol = decodedNames[1] as string;
                  
                  // Try to get router and strategy from topics if available
                  router = log.topics[3] ? '0x' + log.topics[3].slice(-40) : null;
                  strategy = log.topics[4] ? '0x' + log.topics[4].slice(-40) : null;
                } catch (e2) {
                  console.error('Failed to decode any data:', e2);
                  continue;
                }
              }

              return NextResponse.json({
                success: true,
                deployment: {
                  deployer: deployer,
                  token: token,
                  router: router,
                  strategy: strategy,
                  name: name,
                  symbol: symbol,
                  txHash,
                  chainId,
                  blockNumber: receipt.blockNumber.toString(),
                  networkName: chainConfig.networkName,
                },
              });
            } catch (decodeError) {
              console.error('Failed to decode Monad event data:', decodeError);
              continue;
            }
          }
          // Continue to next log if parsing fails
          continue;
        }
      }
    }

    return NextResponse.json(
      { error: "TokenDeployed event not found in transaction logs" },
      { status: 404 }
    );
  } catch (error) {
    console.error("Error parsing deployment:", error);
    return NextResponse.json(
      { error: "Failed to parse transaction receipt" },
      { status: 500 }
    );
  }
}
