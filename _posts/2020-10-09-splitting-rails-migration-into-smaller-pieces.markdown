---
title: Splitting Rails migration into smaller pieces
date: 2020-10-09T15:14:57+02:00
categories:
excerpt:
tags:
  - active record
  - ruby on rails
published: true
---

ActiveRecord migration is a great abstraction over the database schema manipulation.
It looks understandable and works pretty well, however, it can take a while
to migrate tables with billions of records and the developer would need to have
some extra control over it.

Often the ActiveRecord migration produces several SQL queries in a single command.
It can alter table multiple times which will lead to multiple long SQL queries
on huge tables.

If the table is huge and such a migration takes a lot of time, it sounds natural 
to split such a migration into smaller pieces and run them without locking the
table (if that is possible).

In this article we are going to explore how to:

1. log the SQL queries executed during the ActiveRecord migration
2. split such a migration into smaller atomic SQL queries
3. run these queries step by step through the rake task

## Log ActiveRecord SQL queries

Let's say we would like to migrate our very big table `payments` and add a reference to
the user. We can pre-generate the migration:

```sh
$ rails g migration add_user_id_to_payments user:references
```

This will scaffold the ActiveRecord migration which looks like this:

```ruby
class AddUserIdToPayments < ActiveRecord::Migration[5.2]
  def change
    add_reference :payments, :user, foreign_key: true
  end
end
```

But if we run the migration locally, we will see that we there is no SQL output,
just the migration logs:

```sh
$ bundle exec rake db:migrate

== 20201019174359 AddUserIdToPayments: migrating ==============================
-- add_reference(:payments, :user, {:foreign_key=>true})
== 20201019174359 AddUserIdToPayments: migrated (101.1673s) =====================
```

To be able to see the SQL queries executed during this migration process, we can
make a slight change to the migration itself and redirect the ActiveRecord log
to stdout:

```diff
class AddUserIdToPayments < ActiveRecord::Migration[5.2]
+ ActiveRecord::Base.logger = Logger.new(STDOUT)

  def change
    add_reference :payments, :user, foreign_key: true
  end
end
```

If we rollback the migration and run it again, the SQL queries will be printed to the stdout:

```sh
$ bundle exec rake db:migrate

== 20201019174359 AddUserIdToPayments: migrating ==============================
-- add_reference(:payments, :user, {:foreign_key=>true})
D, [2020-10-19T20:44:34.434933 #75984] DEBUG -- :    ALTER TABLE `payments` ADD `user_id` bigint
D, [2020-10-19T20:44:34.502763 #75984] DEBUG -- :    CREATE  INDEX `index_payments_on_user_id`  ON `payments` (`user_id`)
D, [2020-10-19T20:44:35.199157 #75984] DEBUG -- :    ALTER TABLE `payments` ADD CONSTRAINT `fk_rails_39823123`
FOREIGN KEY (`user_id`)
  REFERENCES `users` (`id`)
== 20201019174359 AddUserIdToPayments: migrated (101.1673s) =====================
```

As we can notice, the migration performed three SQL queries:

1. Alter table to add a new column `user_id`
2. Create an index on the just added column
3. Alter table to add a foreign key constraint 

## Split migration

We know we need to add a reference to the `payments` table and it will take a lot of time on
the production database because of the table size. However, as we can see we can split this
migration into three parts, which are backward compatible and safely can be run as
[Online DDL](https://dev.mysql.com/doc/refman/8.0/en/innodb-online-ddl.html) without downtime.

Obviously, each query will take less time than running all of them. So our plan could
be to run each SQL query manually as a non-blocking step on the live server. Often the migration
step is blocking during the deployment, so we could delegate this work to the rake task:

```ruby
namespace :payments do
  def execute(sql)
    ActiveRecord::Base.connection.execute(sql)
  end
  
  desc 'Add a user reference to the payments'
  task reference_user: :environment do
    ActiveRecord::Base.logger = Logger.new(STDOUT)
    
    case ENV['STEP']
    when '1'
      execute('ALTER TABLE `payments` ADD `user_id` bigint')
    when '2'
      execute('CREATE INDEX `index_payments_on_user_id` ON `payments` (`user_id`)')
    when '3'
      execute('ALTER TABLE `payments` ADD CONSTRAINT `fk_rails_39823123`')
    else
      puts 'nothing to do. Pass a STEP you would like to run: 1,2 or 3'
  end
end
```

## Run the migration

Now we can deploy the rake task and migrate the database by hands, before the dependent
code change is deployed. This will require some DevOps attention but it gives more control
on how and when to perform the long-running migration:

```sh
$ STEP=1 bundle exec rake payments:reference_user
$ STEP=2 bundle exec rake payments:reference_user
$ STEP=3 bundle exec rake payments:reference_user
```

Also, it is not required to run all the steps at once thus the dev team can have some
window for the deployment and migration.

## Wrap-up

In this article, we explored how to split long running migration into smaller parts and
run them manually before deploying the dependent code changes. This can be useful when
performing migrations on very big tables without downtime.

The alternative solution could be to:

1. create a new table with the needed structure
2. copy all the records from old table to the new one
3. delete the old table and rename the new one

This is well described in [How to migrate large database tables without a headache](https://blog.arkency.com/how-to-migrate-large-database-tables-without-a-headache/).
However, I find this approach much more complicated which could lead to data loss in case of simple mistakes.

