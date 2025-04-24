require "test_helper"

class Api::V1::TodoItemsControllerTest < ActionDispatch::IntegrationTest
  test "should get create" do
    get api_v1_todo_items_create_url
    assert_response :success
  end

  test "should get update" do
    get api_v1_todo_items_update_url
    assert_response :success
  end

  test "should get destroy" do
    get api_v1_todo_items_destroy_url
    assert_response :success
  end
end
