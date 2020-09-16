---
title: Grouping model versions in PaperTrail
date: 2020-09-16T15:14:57+02:00
categories:
excerpt: Article explains how to group and efficiently query model versions with PaperTrail in Ruby on Rails application.
tags: [paper-trail ruby ruby-on-rails]
published: true
---

Auditing model changes is a common task in modern software development.
Whether it is a feature request or just some debugging purpose in mind, 
when the complexity of the system grows it is natural to add ability
to quickly see the changes made by someone.

There is a bunch of available libraries, which allows to add versioning
to the ruby/rails application really quickly:

* [paper_tail](https://github.com/paper-trail-gem/paper_trail)
* [audited](https://github.com/collectiveidea/audited)
* [paranoia](https://github.com/rubysherpas/paranoia)
* [marginalia](https://github.com/basecamp/marginalia)
* [acts_as_paranoid](https://github.com/ActsAsParanoid/acts_as_paranoid)
* [mongoid-history](https://github.com/mongoid/mongoid-history)
* ...

These tools give an ability to solve most of the day-to-day tasks having
a great user-friendly DSL. For example:

```ruby
user = User.create!(name: 'Steve')
user.update!(name: 'Ryan')
user.audited_changes # => {"name"=>["Steve", "Ryan"]}
```

However, when the objective is to handle more complicated tasks, it can
be not that strait-forward. Let's say we already have hundred thousands
of records in our audit table, but we want to have an ability to group
them by some criteria, in other words we would like to fetch the versions
which were created for specific set of records at some concrete endpoint.

Let's describe and example using `PaperTrail` as an audit library.


### Task definition

```ruby
class Category < ApplicationRecord
  has_paper_trail

  belongs_to :parent, class_name: 'Category', optional: true
  has_many :children, class_name: 'Category', dependent: :destroy
  
  # Creates a clone of the category together with nested category tree
  def deep_clone
    # ...
  end
end
```


```ruby
class CategoriesController < ApplicationController
  def clone
    clone = category.deep_clone

    if clone.save
      redirect_to(clone)
    else
      flash[:errors] = clone.errors.full_messages
      redirect_to :back
    end
  end
  
  private

    def category
      @category ||= Category.find(params[:id])
    end
end
```
