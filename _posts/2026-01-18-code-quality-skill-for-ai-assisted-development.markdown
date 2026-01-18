---
title: "Code quality skill for AI-assisted development"
date: 2026-01-18T14:00:00+02:00
excerpt: "How a code-quality skill transforms AI-generated code from functional to maintainable by enforcing SOLID principles, eliminating magic numbers, and keeping changes focused on the task at hand."
tags:
  - ai
  - code-quality
  - development
  - best-practices
published: true
---

Agents generate working code in seconds these days.
But "working" and "maintainable" aren't the same thing.
The difference shows up weeks later when the team needs to modify that code, debug an issue, or onboard a new developer.

A [code-quality skill](https://github.com/veelenga/dotfiles/blob/master/.claude/skills/code-quality/SKILL.md) addresses this gap.
Instead of generating code that merely works, it enforces principles that make code readable, maintainable, and pragmatic.
Let's break it down.

## What Is a Code Quality Skill?

A code-quality skill is a specialized instruction set that modifies how an AI agent writes code.
When active, it transforms the agent's behavior from "generate code that solves the problem" to "generate code that solves the problem *and* is maintainable."

The skill enforces:
- **SOLID principles** for better architecture
- **Constants instead of magic numbers** for clarity
- **Focused methods and classes** for readability
- **Pragmatic design** without overengineering
- **Task-focused changes** without drive-by refactoring

## The Core Philosophy

The skill operates on four principles:

1. **Readable** - Clear intent, self-documenting where possible
2. **Maintainable** - Easy to change and extend
3. **Pragmatic** - Solve the problem at hand without overengineering
4. **Reusable** - Components designed for future use when appropriate

## Concrete Examples

### Before: Magic Numbers

Without a code-quality skill, AI-generated code often contains unexplained literals:

```ruby
def calculate_discount(order_total)
  if order_total > 1000
    order_total * 0.15
  elsif order_total > 500
    order_total * 0.10
  else
    order_total * 0.05
  end
end
```

What's special about 1000? Why 15%? When these thresholds change, where else do they appear?

### After: Named Constants

With a code-quality skill active:

```ruby
class DiscountCalculator
  PREMIUM_THRESHOLD = 1000
  STANDARD_THRESHOLD = 500

  PREMIUM_RATE = 0.15
  STANDARD_RATE = 0.10
  BASIC_RATE = 0.05

  def self.calculate(order_total)
    case order_total
    when PREMIUM_THRESHOLD..Float::INFINITY
      order_total * PREMIUM_RATE
    when STANDARD_THRESHOLD...PREMIUM_THRESHOLD
      order_total * STANDARD_RATE
    else
      order_total * BASIC_RATE
    end
  end
end
```

Now the values have meaning. When discount rates change, updates happen in one place. The logic is self-documenting.

### Before: Doing Too Much

Without a code-quality skill:

```javascript
async function createUser(userData) {
  // Validate
  if (!userData.email || !userData.email.includes('@')) {
    throw new Error('Invalid email');
  }

  // Hash password
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(userData.password, salt);

  // Save to database
  const user = await db.users.create({
    ...userData,
    password: hashedPassword,
    createdAt: new Date()
  });

  // Send welcome email
  await sendEmail({
    to: user.email,
    subject: 'Welcome!',
    body: 'Thanks for signing up'
  });

  // Log the event
  await auditLog.record('USER_CREATED', { userId: user.id });

  return user;
}
```

This function validates, hashes passwords, persists data, sends email, and logs events. Five reasons to change.

### After: Single Responsibility

With a code-quality skill active:

```javascript
class UserRegistrationService {
  constructor(userRepository, emailService, auditLog) {
    this.userRepository = userRepository;
    this.emailService = emailService;
    this.auditLog = auditLog;
  }

  async register(userData) {
    const validatedData = this.validate(userData);
    const user = await this.userRepository.create(validatedData);

    await Promise.all([
      this.emailService.sendWelcome(user),
      this.auditLog.recordUserCreation(user.id)
    ]);

    return user;
  }

  validate(userData) {
    if (!this.isValidEmail(userData.email)) {
      throw new ValidationError('Invalid email');
    }
    return userData;
  }

  isValidEmail(email) {
    return email && email.includes('@');
  }
}

class UserRepository {
  constructor(db, passwordHasher) {
    this.db = db;
    this.passwordHasher = passwordHasher;
  }

  async create(userData) {
    const hashedPassword = await this.passwordHasher.hash(userData.password);

    return this.db.users.create({
      ...userData,
      password: hashedPassword,
      createdAt: new Date()
    });
  }
}
```

Each class has one responsibility. Testing is straightforward - mock the dependencies. When email logic changes, only `EmailService` changes. When password requirements change, only `PasswordHasher` changes.

## SOLID Principles in Practice

A code-quality skill enforces SOLID principles but knows when to apply them pragmatically.

### Single Responsibility

Every class and method should have one reason to change. The skill extracts responsibilities when logic grows complex:

```ruby
# Without skill: Controller doing too much
class OrdersController
  def create
    order = Order.new(order_params)
    if order.save
      inventory.decrement(order.items)
      payment.charge(order.total)
      mailer.send_confirmation(order)
      render json: order
    else
      render json: order.errors
    end
  end
end

# With skill: Controller delegates to service
class OrdersController
  def create
    result = OrderCreationService.new(order_params).execute

    if result.success?
      render json: result.order
    else
      render json: result.errors, status: :unprocessable_entity
    end
  end
end
```

### Open/Closed

Open for extension, closed for modification. When adding behavior, existing code shouldn't be modified:

```ruby
# Without skill: Adding new payment types requires editing this class
class PaymentProcessor
  def process(type, amount)
    case type
    when 'credit_card'
      process_credit_card(amount)
    when 'paypal'
      process_paypal(amount)
    # Adding bitcoin requires modifying this method
    end
  end
end

# With skill: Strategy pattern allows extension
class PaymentProcessor
  def initialize(payment_strategy)
    @strategy = payment_strategy
  end

  def process(amount)
    @strategy.charge(amount)
  end
end

# Adding bitcoin is just a new class
class BitcoinPaymentStrategy
  def charge(amount)
    # Bitcoin processing logic
  end
end
```

### Dependency Inversion

Depend on abstractions, not concretions. High-level logic shouldn't depend on low-level details:

```ruby
# Without skill: UserService depends on concrete EmailService
class UserService
  def create_user(params)
    user = User.create!(params)
    EmailService.send_welcome(user.email)
    user
  end
end

# With skill: UserService depends on abstraction
class UserService
  def initialize(notifier)
    @notifier = notifier
  end

  def create_user(params)
    user = User.create!(params)
    @notifier.send_welcome(user.email)
    user
  end
end
```

Now different notifiers (email, SMS, push) can be injected without changing `UserService`.

## Method Size and Organization

A code-quality skill enforces practical limits on method size:

- **1-10 lines**: Ideal, easy to understand and test
- **10-25 lines**: Acceptable if logically cohesive
- **25+ lines**: Extract into smaller methods

Here's a refactoring example:

```ruby
# Before: 40+ line method
def process_order(order_id)
  order = Order.find(order_id)

  if order.items.any? { |item| item.quantity > inventory[item.id] }
    raise "Insufficient inventory"
  end

  order.items.each do |item|
    inventory[item.id] -= item.quantity
  end

  total = order.items.sum { |item| item.price * item.quantity }

  if order.coupon_code
    discount = calculate_coupon_discount(order.coupon_code, total)
    total -= discount
  end

  # ... 20 more lines of payment processing, email sending, etc.
end

# After: Small, focused methods
def process_order(order_id)
  order = find_order(order_id)
  validate_inventory(order)
  reserve_inventory(order)
  total = calculate_total(order)
  charge_payment(order, total)
  send_confirmation(order)
end
```

Each extracted method does one thing. The main method reads like a summary of the process.

## Avoiding Overengineering

The skill enforces YAGNI (You Aren't Gonna Need It). Don't build for hypothetical future needs.

### When to Abstract

A code-quality skill suggests abstraction when there are:
- **3+ similar implementations** (Rule of Three)
- **Runtime behavior swapping** needs
- **Library/framework** development
- **Significant testability** improvements

### When NOT to Abstract

Don't abstract when:
- There are only 1-2 cases
- Requirements are unclear
- Abstraction adds complexity without clear benefit

```ruby
# Premature abstraction (avoid)
class ReportGeneratorFactory
  def self.create(type)
    case type
    when :pdf
      PDFReportGenerator.new
    when :csv
      CSVReportGenerator.new
    end
  end
end

# Only two types? Just use them directly:
def generate_report(type, data)
  if type == :pdf
    PDFReportGenerator.new.generate(data)
  else
    CSVReportGenerator.new.generate(data)
  end
end

# Wait until there are 3+ types before introducing the factory
```

## Staying Focused on the Task

One of the most important aspects: **keeping changes focused**.

A code-quality skill enforces this principle:

> Only modify code directly related to the current task or feature. Do not refactor unrelated code unless explicitly asked.

This prevents "drive-by refactoring" where developers start fixing things tangential to the actual goal.

### How It Works

If the AI notices issues in nearby code, a code-quality skill instructs it to:

1. **Point out** what could be improved and why
2. **Suggest** specific improvements
3. **Ask** if those improvements should be made now or deferred
4. **Wait for confirmation** before making unrelated changes

Example output:

> "I noticed the `process_payment` method has similar validation logic. Should I extract it into a shared validator, or keep the current implementation?"

This keeps pull requests focused and reviewable. The feature ships without introducing unrelated changes that complicate code review and increase risk.

## When to Use a Quality Skill

Activate the skill when:
* building new functionality
* improving existing code
* modifying core business logic

## Don't Use It For

The skill is overkill for:
- quick scripts or one-off utilities
- prototypes or proof-of-concepts
- simple configuration changes
- documentation updates

Save it for code that will live in production and be maintained by a team.

## Conclusion

AI-assisted development is fast. A code-quality skill makes that speed sustainable.
By enforcing SOLID principles, eliminating magic numbers, and keeping changes focused, it transforms AI output from "functional" to "maintainable by default."

## Resources

- [Example code-quality skill implementation](https://github.com/veelenga/dotfiles/blob/master/.claude/skills/code-quality/SKILL.md)
- [SOLID Principles](https://en.wikipedia.org/wiki/SOLID)
- [Clean Code by Robert C. Martin](https://www.amazon.com/Clean-Code-Handbook-Software-Craftsmanship/dp/0132350882)
- [Refactoring by Martin Fowler](https://refactoring.com/)
