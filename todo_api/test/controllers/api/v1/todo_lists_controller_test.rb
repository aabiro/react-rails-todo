require "test_helper"

class Api::V1::TodoListsControllerTest < ActionDispatch::IntegrationTest
  test "should get index" do
    get api_v1_todo_lists_index_url
    assert_response :success
  end

  test "should get show" do
    get api_v1_todo_lists_show_url
    assert_response :success
  end
end
