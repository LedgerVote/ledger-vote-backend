package com.example.votingbackend.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.web3j.crypto.Credentials;
import org.web3j.protocol.Web3j;
import org.web3j.protocol.core.RemoteCall;
import org.web3j.protocol.core.methods.response.TransactionReceipt;
import org.web3j.protocol.http.HttpService;
import org.web3j.tx.gas.ContractGasProvider;
import org.web3j.tx.gas.StaticGasProvider;
import org.web3j.tx.RawTransactionManager;
import org.web3j.tx.TransactionManager;
import org.web3j.utils.Convert;

import java.math.BigInteger;
import java.util.List;

import com.example.votingbackend.contract.Voting; // This is the Web3j wrapper class

@Service
public class Web3Service {

    @Value("${web3.rpc.url}")
    private String rpcUrl;

    @Value("${web3.wallet.privateKey}")
    private String privateKey;

    @Value("${web3.contract.address}")
    private String contractAddress;

    private Web3j web3j;
    private Voting votingContract;

    public void init() throws Exception {
        web3j = Web3j.build(new HttpService(rpcUrl));
        Credentials credentials = Credentials.create(privateKey);

//        ContractGasProvider gasProvider = new StaticGasProvider(
//                Convert.toWei("20", Convert.Unit.GWEI).toBigInteger(),
//                BigInteger.valueOf(6721975)
//        );
        BigInteger gasPrice = BigInteger.valueOf(20_000_000_000L); // 20 Gwei
        BigInteger gasLimit = BigInteger.valueOf(6_721_975);

        votingContract = Voting.load(contractAddress, web3j, credentials, gasPrice, gasLimit);
    }

    public void vote(String candidateName) throws Exception {
        if (votingContract == null) init();
        votingContract.vote(candidateName).send();
    }

    public TransactionReceipt getVotes(String candidateName) throws Exception {
        if (votingContract == null) init();
        return votingContract.getVotes(candidateName).send();
    }

    public void voteWithPrivateKey(String candidateName, String privateKey) throws Exception {
        Web3j web3j = Web3j.build(new HttpService(rpcUrl));
        Credentials credentials = Credentials.create(privateKey);

        BigInteger gasPrice = BigInteger.valueOf(20_000_000_000L); // 20 Gwei
        BigInteger gasLimit = BigInteger.valueOf(6_721_975);

        Voting contract = Voting.load(contractAddress, web3j, credentials, gasPrice, gasLimit);
        contract.vote(candidateName).send();
    }




//
//    public List<String> getAllCandidates() throws Exception {
//        if (votingContract == null) init();
//        return votingContract.getAllCandidates().send();
//    }
}

