use starknet::ContractAddress;

#[starknet::interface]
pub trait IPaymentRouter<TContractState> {
    /// Pay a merchant. Deducts fee and sends remainder to merchant.
    fn pay(
        ref self: TContractState,
        merchant: ContractAddress,
        token: ContractAddress,
        amount: u256,
        reference_id: felt252,
    );

    /// Get the fee rate in basis points (e.g. 50 = 0.5%).
    fn get_fee_rate(self: @TContractState) -> u16;

    /// Set the fee rate (owner only).
    fn set_fee_rate(ref self: TContractState, fee_rate: u16);

    /// Withdraw accumulated fees (owner only).
    fn withdraw_fees(ref self: TContractState, token: ContractAddress, to: ContractAddress);

    /// Get accumulated fees for a token.
    fn get_accumulated_fees(self: @TContractState, token: ContractAddress) -> u256;
}

#[starknet::contract]
mod PaymentRouter {
    use starknet::{ContractAddress, get_caller_address, get_contract_address};
    use starknet::storage::{
        Map, StorageMapReadAccess, StorageMapWriteAccess, StoragePointerReadAccess,
        StoragePointerWriteAccess,
    };
    use openzeppelin_access::ownable::OwnableComponent;
    use openzeppelin_token::erc20::interface::{IERC20Dispatcher, IERC20DispatcherTrait};

    component!(path: OwnableComponent, storage: ownable, event: OwnableEvent);

    #[abi(embed_v0)]
    impl OwnableImpl = OwnableComponent::OwnableImpl<ContractState>;
    impl OwnableInternalImpl = OwnableComponent::InternalImpl<ContractState>;

    #[storage]
    struct Storage {
        fee_rate: u16, // basis points, e.g. 50 = 0.5%
        accumulated_fees: Map<ContractAddress, u256>, // token => accumulated fees
        #[substorage(v0)]
        ownable: OwnableComponent::Storage,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        PaymentProcessed: PaymentProcessed,
        FeesWithdrawn: FeesWithdrawn,
        #[flat]
        OwnableEvent: OwnableComponent::Event,
    }

    #[derive(Drop, starknet::Event)]
    struct PaymentProcessed {
        #[key]
        merchant: ContractAddress,
        #[key]
        payer: ContractAddress,
        token: ContractAddress,
        amount: u256,
        fee: u256,
        reference_id: felt252,
    }

    #[derive(Drop, starknet::Event)]
    struct FeesWithdrawn {
        token: ContractAddress,
        to: ContractAddress,
        amount: u256,
    }

    #[constructor]
    fn constructor(ref self: ContractState, owner: ContractAddress, fee_rate: u16) {
        self.ownable.initializer(owner);
        assert(fee_rate <= 1000, 'Fee rate too high'); // max 10%
        self.fee_rate.write(fee_rate);
    }

    #[abi(embed_v0)]
    impl PaymentRouterImpl of super::IPaymentRouter<ContractState> {
        fn pay(
            ref self: ContractState,
            merchant: ContractAddress,
            token: ContractAddress,
            amount: u256,
            reference_id: felt252,
        ) {
            let caller = get_caller_address();
            let this = get_contract_address();
            assert(amount > 0, 'Amount must be > 0');

            let erc20 = IERC20Dispatcher { contract_address: token };

            // Calculate fee
            let fee_rate: u256 = self.fee_rate.read().into();
            let fee = (amount * fee_rate) / 10000;
            let merchant_amount = amount - fee;

            // Transfer from payer to merchant
            erc20.transfer_from(caller, merchant, merchant_amount);

            // Transfer fee to this contract
            if fee > 0 {
                erc20.transfer_from(caller, this, fee);
                let current_fees = self.accumulated_fees.read(token);
                self.accumulated_fees.write(token, current_fees + fee);
            }

            self
                .emit(
                    PaymentProcessed {
                        merchant, payer: caller, token, amount, fee, reference_id,
                    },
                );
        }

        fn get_fee_rate(self: @ContractState) -> u16 {
            self.fee_rate.read()
        }

        fn set_fee_rate(ref self: ContractState, fee_rate: u16) {
            self.ownable.assert_only_owner();
            assert(fee_rate <= 1000, 'Fee rate too high');
            self.fee_rate.write(fee_rate);
        }

        fn withdraw_fees(ref self: ContractState, token: ContractAddress, to: ContractAddress) {
            self.ownable.assert_only_owner();
            let amount = self.accumulated_fees.read(token);
            assert(amount > 0, 'No fees to withdraw');

            self.accumulated_fees.write(token, 0);
            let erc20 = IERC20Dispatcher { contract_address: token };
            erc20.transfer(to, amount);

            self.emit(FeesWithdrawn { token, to, amount });
        }

        fn get_accumulated_fees(self: @ContractState, token: ContractAddress) -> u256 {
            self.accumulated_fees.read(token)
        }
    }
}
