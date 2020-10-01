---
title: Joining polymorphic associations in ActiveRecord
date: 2020-09-30T15:14:57+02:00
categories:
excerpt: Short list of thoughts on how to join polymorphic associations in ActiveRecord and why it cannot be loaded eagerly.
tags: [polymorphism active-record ruby-on-rails]
published: true
---

Polymorphic associations in ActiveRecord allow to belong to more than one model
on a single associations. The mechanism is very powerful because helps to DRY
the code and make the database schema clean. Let's have a quick example:

```ruby
class Payment < ApplicationRecord
  belongs_to :subject, polymorphic: true
end

class User < ApplicationRecord
  has_many :payments, as: :subject
end

class Artist < ApplicationRecord
  has_many :payments, as: :subject
end
```

So the payment can belong to multiple type of models marked as `subject` and to distinguish 
them by `subject_id` and `subject_type` columns at the database level. In our simple example,
we have two different entities who can create multiple payments: User and Artist.

<img src='/images/joining-polymorphic-associations/schema.png' alt='db-schema'>

Keep in mind, that this is not the payment between User and Artist, these are payments created
by users or by artists. And such records are going to be stored in a single table `payments`.
The first question which comes to the mind, what would happen if we try to join the polymorphic
association to the Payment?

## Join polymorphic association

```ruby
> Payment.joins(:subject).last

ActiveRecord::EagerLoadPolymorphicError: Cannot eagerly load the polymorphic association :subject
```

The error says it is not able to eagerly load the polymorphic association. And that is reasonable
because `subject` is a general name for our association and ActiveRecord doesn't know what table 
to join on. If we try to construct a SQL query by hand we can end up by something like this:

```sql
SELECT payments.* FROM payments
  INNER JOIN users ON users.id = payments.subject_id
```

but here we join on a specific table `users` and payment actually can belong to `artists` so
we miss some data we want. The solution might be to do multiple queries to join on multiple
tables the payment belongs to.

## Include polymorphic association

And that is what the ActiveRecord's `includes` method does.
It performs multiple queries to fetch the data. In the example below, if we change
`joins` to `includes` the error is gone, however if we look closely to the explanation,
we can see that ActiveRecord does as many extra queries to the database as the number of
different types of models the polymorphic association has.
In our case 2 queries: to table `users` and to table `artists`.

```ruby
> Payment.includes(:subject).last #=> <Payment...>
> Payment.includes(:subject).map(&:subject_id) #=> [2, 1, 2]

> Payment.includes(:subject).explain
=> EXPLAIN for: SELECT "payments".* FROM "payments"
2|0|0|SCAN TABLE payments

EXPLAIN for: SELECT "users".* FROM "users" WHERE "users"."id" = ? [["id", 2]]
2|0|0|SEARCH TABLE users USING INTEGER PRIMARY KEY (rowid=?)

EXPLAIN for: SELECT "artists".* FROM "artists" WHERE "artists"."id" IN (?, ?) [["id", 1], ["id", 2]]
2|0|0|SEARCH TABLE artists USING INTEGER PRIMARY KEY (rowid=?)

```

## Define the association with a scope

What if our polymorphic association belongs to too many different type of models and we want
to efficiently query by single association? A solution might be to define an extra association
for this specific type of model:

```diff
class Payment < ApplicationRecord
  belongs_to :subject, polymorphic: true
+ belongs_to :user, foreign_key: 'subject_id', -> { where(payments: { subject_type: 'User' }) }
end
```

In this example we defined a user association with an extra scope on it, so
ActiveRecord can properly made the join and filter the associated records by `subject_type`:

```ruby
> Payment.joins(:user).explain

=> EXPLAIN for: SELECT "payments".* FROM "payments"
   INNER JOIN "users" ON "users"."id" = "payments"."subject_id"
   AND "payments"."subject_type" = ? [["subject_type", "User"]]

4|0|0|SEARCH TABLE payments USING INDEX index_payments_on_subject_type_and_subject_id (subject_type=?)
11|0|0|SEARCH TABLE users USING INTEGER PRIMARY KEY (rowid=?)
```

## Define the association through the self ref

There is another possible way to let the join work, but i find it a bit tricky:

```diff
class Payment < ApplicationRecord
  belongs_to :subject, polymorphic: true
+
+ has_one :self_ref, class_name: 'Payment', foreign_key: :id
+ has_one :user, through: :self_ref, source: :subject, source_type: 'User'
end
```

Here we define a `self_ref` association to have a relationship to self and then
define the needed association to the user through self. Looks a bit hacky, right?
But anyway it still works, even if it has one extra join to the self table:

```ruby
> Payment.joins(:user).explain

=> EXPLAIN for: SELECT "payments".* FROM "payments"
   INNER JOIN "payments" "self_refs_payments_join" ON "self_refs_payments_join"."id" = "payments"."id"
   AND "self_refs_payments_join"."subject_type" = ?
   INNER JOIN "users" ON "users"."id" = "self_refs_payments_join"."subject_id" [["subject_type", "User"]]

4|0|0|SEARCH TABLE payments AS self_refs_payments_join USING COVERING INDEX index_payments_on_subject_type_and_subject_id (subject_type=?)
10|0|0|SEARCH TABLE payments USING INTEGER PRIMARY KEY (rowid=?)
13|0|0|SEARCH TABLE users USING INTEGER PRIMARY KEY (rowid=?)

```

## Wrap up

In this article we talked about 3 possible solutions to deal with the polymorphic associations
in ActiveRecord:

* using `include`
* defining a new association with a scope
* defining a new association with a self ref

I think the developer should take the one which fits the most of his needs or maybe even
overthink if polymorphic association is required for that particular case.
