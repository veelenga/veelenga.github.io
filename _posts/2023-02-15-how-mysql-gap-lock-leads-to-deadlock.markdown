---
title: How MySQL gap lock can lead to deadlock
date: 2023-02-15T12:14:57+02:00
categories:
excerpt:
tags:
  - mysql
  - deadlock
published: true
---

MySQL implements gap locks as a locking mechanism to control access to a table.
A gap lock can be used in a `SELECT` statement with the `FOR UPDATE` or `LOCK IN SHARE MODE` clause, to lock the gap and prevent other transactions from inserting a new row with a duplicate key value in the gap.
This can be useful for enforcing unique constraints or ensuring consistency when processing a series of related transactions.

However, a gap lock can lead to a deadlock when two or more transactions try to lock the same gap simultaneously, and each transaction is waiting for the other to release the lock.
This results in a circular wait, where each transaction is waiting for the lock held by the other, and neither transaction can proceed.

<video controls="controls" width="100%" name="MySQL Deadlock">
  <source src="/images/mysql-deadlock/demo.mp4">
</video>

Let's find out how gap locking works and what actually triggers a deadlock.

## Table structure

Suppose we have a table named `products` with column `code`, and we want the values inserted to this column to be unique.
The most straightforward way to achieve this is to add a unique index to the `code` column.
The table structure can look like this:

```sql
+------------+--------------+------+-----+---------+----------------+
| Field      | Type         | Null | Key | Default | Extra          |
+------------+--------------+------+-----+---------+----------------+
| id         | bigint(20)   | NO   | PRI | NULL    | auto_increment |
| code       | varchar(255) | NO   | UNI | NULL    |                |
+------------+--------------+------+-----+---------+----------------+
```

The following `products` table has only two columns:

* `id` column: A bigint(20) data type column which is the primary key of the table, with auto-increment enabled.
* `code` column: A varchar(255) data type column which is set to not allow null values and has a unique constraint. This column is used to store the code of the product and ensures that each product code is unique.

## Concurrent inserts and gap lock

Gap locks can result in a situation called a gap lock wait, where one transaction waits for another transaction holding a gap lock to release it.
This is needed in order to guarantee data consistency and not break the unique constraint.

Such a lock can be easily demonstrated using two concurrent transactions (running using two different connections).

Transaction 1:

```sql
START TRANSACTION; -- T1

INSERT INTO `products` (`code`) VALUES ('112');
```

Transaction 2:

```sql
START TRANSACTION; -- T2

INSERT INTO `products` (`code`) VALUES ('112');
```

If we execute T1, it will start a new transaction and insert a new row to `products` table.
Which obviously will not be visible until the transaction is committed.
However, if we start another transaction T2 using a separate connection and try to insert a product with the same `code`, it will be locked.
MySQL understands that there is a separate transaction that can be committed or rolled back and waits for that transaction to finish.

## Analyzing the deadlock

In the example above, both transactions try to insert a row with the same `code` value '112', but the gap lock acquired by T1 prevents T2 from inserting a row with the same value.
As a result, T2 has to wait for T1 to release the lock on the gap, which can lead to a potential deadlock if T1 is also waiting for a lock held by T2.

The simplest way to trigger a deadlock is to expand T1 and insert one more row which will span the gap lock on T2:

```sql
START TRANSACTION; -- T1

INSERT INTO `products` (`code`) VALUES ('112');

INSERT INTO `products` (`code`) VALUES ('111'); -- triggers deadlock
```

Fortunately, MySQL is smart enough to detect a deadlock and mitigate the issue.
If we check the latest innodb status by running the command `show engine innodb status;`, we will find extra information about the latest detected deadlock:

```
------------------------
LATEST DETECTED DEADLOCK
------------------------
2023-02-15 18:51:25 0x170577000
*** (1) TRANSACTION:
TRANSACTION 1255170, ACTIVE 4 sec inserting
mysql tables in use 1, locked 1
LOCK WAIT 2 lock struct(s), heap size 1136, 1 row lock(s), undo log entries 1
MySQL thread id 234, OS thread handle 6180401152, query id 1768461 localhost root update
INSERT INTO `products` (`code`) VALUES ('112')
*** (1) WAITING FOR THIS LOCK TO BE GRANTED:
RECORD LOCKS space id 134040 page no 4 n bits 72 index index_products_on_code of table `products` trx id 1255170 lock mode S waiting
Record lock, heap no 2 PHYSICAL RECORD: n_fields 2; compact format; info bits 0
 0: len 3; hex 313132; asc 112;;
 1: len 8; hex 800000000000000a; asc         ;;

*** (2) TRANSACTION:
TRANSACTION 1255169, ACTIVE 11 sec inserting
mysql tables in use 1, locked 1
3 lock struct(s), heap size 1136, 2 row lock(s), undo log entries 2
MySQL thread id 233, OS thread handle 6179745792, query id 1768462 localhost root update
INSERT INTO `products` (`code`) VALUES ('111')
*** (2) HOLDS THE LOCK(S):
RECORD LOCKS space id 134040 page no 4 n bits 72 index index_products_on_code of table `products` trx id 1255169 lock_mode X locks rec but not gap
Record lock, heap no 2 PHYSICAL RECORD: n_fields 2; compact format; info bits 0
 0: len 3; hex 313132; asc 112;;
 1: len 8; hex 800000000000000a; asc         ;;

*** (2) WAITING FOR THIS LOCK TO BE GRANTED:
RECORD LOCKS space id 134040 page no 4 n bits 72 index index_products_on_code of table `products` trx id 1255169 lock_mode X locks gap before rec insert intention waiting
Record lock, heap no 2 PHYSICAL RECORD: n_fields 2; compact format; info bits 0
 0: len 3; hex 313132; asc 112;;
 1: len 8; hex 800000000000000a; asc         ;;

*** WE ROLL BACK TRANSACTION (1)
```

Let's go through the report:

1. There are two transactions (TRANSACTION 1255170 and TRANSACTION 1255169) that are inserting a new product into the `products` table.
Both transactions have acquired locks on the same index page for the `code` column using different lock modes.
2. Transaction 1255169 is holding an exclusive (X) lock on a row with a `code` value of '112', while transaction 1255170 is waiting for a shared (S) lock on the same row.
At the same time, transaction 1255170 is holding a shared (S) lock on the index page, while transaction 1255169 is waiting for an exclusive (X) lock on the gap before the '112' row.
3. Because of this circular wait, neither transaction can proceed, and a deadlock is detected.
To resolve the deadlock, the database automatically chooses one of the transactions to roll back (in this case, transaction 1255170).
The other transaction (transaction 1255169) is allowed to proceed and complete its insert operation.

## Wrap-up

Databases like any software are not ideal and can't prevent you from having issues.
Deadlock is one of the issues which could be easily happened and developers should know how to understand and fix the problem.

Obviously, to prevent deadlocks, it's important to design your database schema and queries in a way that minimizes the chances of two or more transactions conflicting with each other.
In addition, you can use features like row-level locking, transaction isolation levels, and query optimization techniques to reduce the likelihood of deadlocks in your application.
