const UserRepository = require('./UserRepository');
const DailyRepository = require('./DailyRepository');
const PaymentRepository = require('./PaymentRepository');
const BetRepository = require('./BetRepository');
const RankRepository = require('./RankRepository');
const TicketRepository = require('./TicketRepository');
const ErrorRepository = require('./ErrorRepository');

// 創建單例實例
const userRepository = new UserRepository();
const dailyRepository = new DailyRepository();
const paymentRepository = new PaymentRepository();
const betRepository = new BetRepository();
const rankRepository = new RankRepository();
const ticketRepository = new TicketRepository();
const errorRepository = new ErrorRepository();

module.exports = {
    UserRepository,
    DailyRepository,
    PaymentRepository,
    BetRepository,
    RankRepository,
    TicketRepository,
    ErrorRepository,
    
    userRepository,
    dailyRepository,
    paymentRepository,
    betRepository,
    rankRepository,
    ticketRepository,
    errorRepository,
    
    repositories: {
        user: userRepository,
        daily: dailyRepository,
        payment: paymentRepository,
        bet: betRepository,
        rank: rankRepository,
        ticket: ticketRepository,
        error: errorRepository,
    }
};