---
title: Tracking PaperTrail versions per request
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

![](https://media.giphy.com/media/l0HlCSRTZIlN2WJfW/giphy.gif)

There are plenty of tools which allow to quickly add versions to the
app and most of them have very nice DSL on top, which implies interaction
with auditing to be very efficient.

However, it is often easy to solve the regular daily tasks, but it can be much
harder to deal with more complicated issues.

Let's say, we would like to efficiently track **a group of model versions** using
[PaperTrail](https://github.com/paper-trail-gem/paper_trail) which were created
during a specific POST/PATCH request. This can be useful when app has some heavy
endpoint which doesn't just create/update a single record in a database, but **performs
a bunch of save operations** on different kind of models.

## Tracking save requests

At first, we would like to have a mechanism to track save requests in the app.
To solve that, we can just create a `SaveRequest` model with a few extra
columns for debugging purpose.

A Rails migration could look like this:

```ruby
create_table :save_requests do |t|
  t.datetime :created_at, null: false, default: -> { 'CURRENT_TIMESTAMP' }
  t.belongs_to :user, null: false
end
```

And the model would just be as simple as this:

```ruby
class SaveRequest < ApplicationRecord
  belongs_to :user
end
```

Now, in the controller of our heavy endpoint we are going to create a new `SaveRequest` record
on each create/update HTTP request:

```ruby
class BatchCategoriesController < ApplicationController
  prepend_before_action :track_save_request, only: %i[update create]

  private

    def track_save_request
      @save_request ||= SaveRequest.create!(user: current_user)
    end
end
```

So we have an ability to track the save requests performed by the client using our endpoint.
However, how can we track the changes made during this call?

## Tracking versions per save request

To be able to solve this, the first step will be to add a reference between `SaveRequest`
and `PaperTrail::Version` models so the db schema would look like this:

<img src='/images/tracking-paper-trail-versions/db-schema.png' alt='db-schema'>

A new migration just adds a new reference to versions table:

```ruby
def change
  add_reference :versions, :save_request, foreign_key: true, index: true
end
```

and it looks obvious to add a `has_many` relation to the `SaveRequest` model now:

```diff
class SaveRequest < ApplicationRecord
  belongs_to :user
+ has_many :request_versions, class_name: 'PaperTrail::Version', foreign_key: :save_request_id
end
```

At this point we have a relationship between the save request and the versions, but how do we actually
associate these records properly? The solution is not really straightforward and depends on the
[PaperTrail's metadata](https://github.com/paper-trail-gem/paper_trail/blob/a2bf2ffc9ccbfb5e28a395da0953104af2b006e5/README.md#metadata-from-controllers)
feature.

PaperTrail allows passing some extra information to the versions by overriding the `info_for_paper_trail`
method in the controller. So all the created in this endpoint versions will have that information.

That way we can attach the specific save request to the each of the created version:

```diff
class BatchCategoriesController < ApplicationController
+ attr_reader :save_request

  prepend_before_action :track_save_request, only: %i[update create]

+ # Store metadata for PaperTrail::Version
+ def info_for_paper_trail
+   { save_request_id: save_request.id }
+ end

  private

    def track_save_request
-     @save_request ||= SaveRequest.create!(user: current_user)
+     @save_request ||= PaperTrail.request(enabled: false) do
+       SaveRequest.create!(user: current_user)
+     end
    end
end
```

That's actually it, let's give it a try.

## Demo time

It we create (or update) multiple categories using our `BatchCategoriesController`
we will see that a new save request is created and there are PaperTrail versions
associated with it:

```ruby
> request = SaveRequest.last # =>
  # <SaveRequest id: 1, user_id: 3, created_at: "2020-09-16 23:58:33">

> request.request_versions.limit(2).map(&:changeset) # =>
  # [
  #   {
  #     "parent_category_id": [
  #       null,
  #       671
  #     ],
  #     "updated_at": [
  #       "2019-08-19 01:58:15 UTC",
  #       "2020-09-24 23:58:35 UTC"
  #     ]
  #   },
  #   {
  #     "name": [
  #       "Old Category Name",
  #       "New Category Name"
  #     ],
  #     "parent_category_id": [
  #       null,
  #       673
  #     ],
  #     "updated_at": [
  #       "2019-08-19 01:58:15 UTC",
  #       "2020-09-16 23:58:35 UTC"
  #     ]
  #   }
  # ]

```

## Wrap Up

In this article we described how to track paper trail versions on per save request
basis using metadata to store information about the request at PaperTrail versions table.
Such an approach will give an ability to quickly find the version changes made in a
specific request.

**There are some improvements to think about:**

* if the app cleans up stale versions, it would probably have to clean the orphan
`SaveRequest` records as well
* if the endpoint fails to process a save request, we would probably have to destroy the
created `SaveRequest` record or wrap it into transaction and rollback it automatically
* migrating `versions` table can be challenging if it is very big. Other techniques can be
applied in order to speed up the process (i.e. creating a new table and copying the data)
* delayed execution support can be added in different ways depending on the requirements
(current save request can be passed to the job or a new record can be created to group versions
created at the job level)

## Related posts

* [Tracking All Paper Trail Version From A Single Request With Correlation UUIDs](https://karolgalanciak.com/blog/2020/09/20/tracking-all-paper-trail-version-from-a-single-request-with-correlation-uuids/)
